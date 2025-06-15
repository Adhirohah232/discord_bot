const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const express = require('express');
// Bot configuration
const TOKEN = 'MTM4MzQ1OTQxMzQyNzIyODcyMg.GVhU6G.vMTMVD7nDwUIJxM_PDrDl32rAequTZZf1Ss3Gg';
const CLIENT_ID = '1383459413427228722';

// Google Sheets configuration
const SPREADSHEET_ID = '1oFPySFz6q10yrw5D9TUdfcCdvn0PpGrPk-cdvsZVTAE';

const PORT = process.env.PORT || 3000;

// Create Express app for health checks
const app = express();

// Health check endpoints
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        bot_status: client.user ? 'connected' : 'disconnected',
        bot_username: client.user ? client.user.tag : 'N/A'
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'discord-bot',
        timestamp: new Date().toISOString()
    });
});

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Start the HTTP server
app.listen(PORT, () => {
    console.log(`🌐 HTTP server is running on port ${PORT}`);
});

// Keep-alive function
function keepAlive() {
    setInterval(() => {
        console.log(`🔄 Keep-alive ping at ${new Date().toISOString()}`);
    }, 14 * 60 * 1000); // Every 14 minutes
}

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Enable this in Discord Developer Portal
    ]
});

// Google Sheets helper functions using direct API calls
async function getSheetData() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
        const response = await axios.get(url);
        
        // Parse the response (Google returns JSONP, we need to extract JSON)
        const jsonString = response.data.substring(47).slice(0, -2);
        const data = JSON.parse(jsonString);
        
        return data.table.rows.map(row => ({
            sno: row.c[0]?.v || '',
            date: row.c[1]?.v || '',
            steps: row.c[2]?.v || ''
        }));
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        throw error;
    }
}

async function updateStepsData(date, steps) {
    try {
        // Replace this with your Google Apps Script Web App URL
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbwyCFLzdzDf4EzL2dyw7w2gkAzG7KWG6tC6fapkU00ybgeE5N-FqJd4E21fB1S0o4mb/exec';
        
        const response = await axios.post(scriptUrl, {
            date: date,
            steps: steps,
            spreadsheetId: SPREADSHEET_ID
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = response.data;
        return { 
            updated: result.success, 
            action: result.action,
            error: result.error 
        };
    } catch (error) {
        console.error('Error updating spreadsheet:', error);
        return { updated: false, error: error.message };
    }
}

// Date picker helper functions
function getCurrentDate() {
    return new Date();
}

function getDateOptions(currentDate) {
    const options = [];
    const today = new Date(currentDate);
    
    // Generate last 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        const dateStr = date.toISOString().split('T')[0];
        const label = i === 0 ? 'Today' : 
                     i === 1 ? 'Yesterday' : 
                     `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        
        options.push({
            label: label,
            value: dateStr,
            description: dateStr
        });
    }
    
    return options.slice(0, 25); // Discord limit
}

// Summary helper functions
async function getMonthlyData(yearMonth) {
    try {
        const data = await getSheetData();
        // console.log('Raw sheet data:', data); // Debug log
        
        // Parse yearMonth (format: "2025-4" -> year: 2025, month: 4 (0-based, so May))
        const [targetYear, targetMonth] = yearMonth.split('-').map(Number);
        
        // Filter data for the specified month
        const monthlyData = data.filter(row => {
            if (!row.date || !row.steps || row.steps === '') return false;
            
            const dateStr = row.date.toString();
            // console.log(`Checking date: ${dateStr} against ${yearMonth}`); // Debug log
            
            // Parse the Date(2025,3,25) format
            const dateMatch = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
            if (!dateMatch) {
                // console.log(`Could not parse date: ${dateStr}`);
                return false;
            }
            
            const [, year, month, day] = dateMatch.map(Number);
            
            // Both your data and our comparison use 0-based months
            const isMatch = year === targetYear && month === targetMonth;
            // console.log(`Date ${dateStr} -> Year: ${year}, Month: ${month}, Target: ${targetMonth}, Match: ${isMatch}`);
            
            return isMatch;
        });
        
        // console.log('Filtered monthly data:', monthlyData); // Debug log
        
        // Convert to proper format
        return monthlyData.map(row => {
            const dateStr = row.date.toString();
            const dateMatch = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
            const [, year, month, day] = dateMatch.map(Number);
            
            // Convert to standard YYYY-MM-DD format (convert month to 1-based for display)
            const formattedDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            return {
                date: formattedDate,
                steps: parseInt(row.steps) || 0
            };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
        console.error('Error fetching monthly data:', error);
        throw error;
    }
}


function analyzeMonthlySummary(monthlyData, yearMonth) {
    if (monthlyData.length === 0) {
        return {
            error: 'No data found for this month'
        };
    }
    
    const steps = monthlyData.map(d => d.steps).filter(s => s > 0);
    const dates = monthlyData.map(d => d.date);
    
    // Calculate statistics
    const totalSteps = steps.reduce((sum, s) => sum + s, 0);
    const averageSteps = Math.round(totalSteps / steps.length);
    const maxSteps = Math.max(...steps);
    const minSteps = Math.min(...steps);
    
    // Find max and min step days
    const maxDay = monthlyData.find(d => d.steps === maxSteps)?.date;
    const minDay = monthlyData.find(d => d.steps === minSteps)?.date;
    
    // Calculate missed days - fix the date calculation
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate(); // This is correct for 1-indexed months
    const recordedDays = dates.length;
    const missedDays = daysInMonth - recordedDays;
    
    // Find date gaps - fix the date range generation
    const dateGaps = [];
    const allDates = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        allDates.push(dateStr);
        if (!dates.includes(dateStr)) {
            dateGaps.push(dateStr);
        }
    }
    
    // Health assessment
    let healthAssessment = '';
    let healthEmoji = '';
    
    if (averageSteps >= 10000) {
        healthAssessment = 'Excellent! You\'re meeting the WHO recommended 10,000+ steps daily.';
        healthEmoji = '🏆';
    } else if (averageSteps >= 7500) {
        healthAssessment = 'Good! You\'re quite active, try to reach 10,000 steps daily.';
        healthEmoji = '👍';
    } else if (averageSteps >= 5000) {
        healthAssessment = 'Fair. Consider increasing your daily activity to reach 7,500+ steps.';
        healthEmoji = '⚠️';
    } else {
        healthAssessment = 'Needs improvement. Try to be more active and aim for at least 5,000 steps daily.';
        healthEmoji = '📈';
    }
    
    return {
        yearMonth,
        totalSteps,
        averageSteps,
        maxSteps,
        minSteps,
        maxDay,
        minDay,
        recordedDays,
        missedDays,
        daysInMonth,
        dateGaps: dateGaps.slice(0, 10), // Show max 10 missed dates
        healthAssessment,
        healthEmoji
    };
}

function formatSummaryMessage(summary) {
    if (summary.error) {
        return `❌ ${summary.error}`;
    }
    
    const missedDatesText = summary.dateGaps.length > 0 
        ? `\n📅 **Missed Dates:** ${summary.dateGaps.join(', ')}${summary.dateGaps.length >= 10 ? '...' : ''}`
        : '\n✅ **No missed days!**';
    
    return `📊 **Chika's Step Count Summary for ${summary.yearMonth}**
    
📈 **Statistics:**
- Total Steps: ${summary.totalSteps.toLocaleString()}
- Average Steps/Day: ${summary.averageSteps.toLocaleString()}
- Highest Steps: ${summary.maxSteps.toLocaleString()} (${summary.maxDay})
- Lowest Steps: ${summary.minSteps.toLocaleString()} (${summary.minDay})

📅 **Activity Days:**
- Days Recorded: ${summary.recordedDays}/${summary.daysInMonth}
- Days Missed: ${summary.missedDays}
${missedDatesText}

${summary.healthEmoji} **Health Assessment:**
${summary.healthAssessment}

💡 **Tips:**
${'Discipline mantain kadna haan roj😤, bas...\nConcentrate on ur breathing for sometime agr jane ka mood na kare toh'}`;
}

// Slash command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Get a friendly greeting message!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('goodbye')
        .setDescription('Get a farewell message!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('chika')
        .setDescription("Get chika's greeting")
        .toJSON(),
    new SlashCommandBuilder()
        .setName('emoji')
        .setDescription("loads of emojis")
        .toJSON(),
    new SlashCommandBuilder()
        .setName('updatecounts')
        .setDescription('Update step counts in the spreadsheet')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('summarize')
        .setDescription('Get monthly step count summary')
        .toJSON()
];

// Register slash commands
const rest = new REST().setToken(TOKEN);

async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
}

// When the client is ready, run this code
client.once('ready', () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log(`Invite URL: https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=2048&scope=bot%20applications.commands`);
    deployCommands();
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'hello') {
            const greetings = [
                '👋 Hello there! This bot is being created with the intention of helping reduce Chika\'s body-fat. It is currently under maintenance. Meanwhile, u can check the other features of this App- try metioning @Adi_bot'
            ];
            
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            
            await interaction.reply({
                content: randomGreeting,
                ephemeral: false
            });
            
        } else if (interaction.commandName === 'chika') {
            const chikaMsgs = [
                '👋 Hello there! I\'m Chika!..The chiklet🥱',
                '✨ Hey! Chika here, ready to brighten your day!',
                '🌟 Chika reporting for duty! How can I help?',
                '😊 It\'s me, Chika! Hope you\'re doing great!'
            ];
            
            const randomChika = chikaMsgs[0];
            
            await interaction.reply({
                content: randomChika,
                ephemeral: false
            });
            
        } else if (interaction.commandName === 'goodbye') {
            const farewells = [
                '👋 Goodbye! See you later!',
                '🌙 Farewell! Have a wonderful rest of your day!',
                '✨ Until next time! Take care!',
                '😊 Bye for now! Hope to see you again soon!',
                '🎉 Catch you later! Stay awesome!',
                '💫 See you around! Have a great time!'
            ];
            
            const randomFarewell = farewells[Math.floor(Math.random() * farewells.length)];
            
            await interaction.reply({
                content: randomFarewell,
                ephemeral: false
            });
        } else if (interaction.commandName === 'emoji') {
            const emojimsg = [
                '❤️❤️🫂❤️❤️\n😘😘❤️🥰🥰\n🥰🥰❤️😘😘\n❤️❤️🫂❤️❤️'
            ];
            
            const emojirandom = emojimsg[0];
            
            await interaction.reply({
                content: emojirandom,
                ephemeral: false
            });
        } else if (interaction.commandName === 'updatecounts') {
            // Create date selection menu
            const currentDate = getCurrentDate();
            const dateOptions = getDateOptions(currentDate);
            
            const dateSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('date_select')
                .setPlaceholder('Select a date')
                .addOptions(dateOptions);
            
            const dateRow = new ActionRowBuilder().addComponents(dateSelectMenu);
            
            await interaction.reply({
                content: '📅 Please select a date for your step count:',
                components: [dateRow],
                flags: 64 // ephemeral flag
            });
       } else if (interaction.commandName === 'summarize') {
    // Create month selection dropdown instead of modal
    const currentDate = new Date();
    const monthOptions = [];
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        
        // Keep JavaScript's 0-based month system to match your Google Sheets data
        const year = date.getFullYear();
        const month = date.getMonth(); // Keep 0-based (0=Jan, 1=Feb, etc.)
        const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        
        monthOptions.push({
            label: monthName,
            value: yearMonth,
            description: `${year}-${(month + 1).toString().padStart(2, '0')}` // Show 1-based for user clarity
        });
        
        // console.log(`Generated option: ${monthName} -> ${yearMonth} (internal) | Display: ${year}-${(month + 1).toString().padStart(2, '0')}`);
    }
    
    const monthSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('month_select')
        .setPlaceholder('Select a month for summary')
        .addOptions(monthOptions);
    
    const monthRow = new ActionRowBuilder().addComponents(monthSelectMenu);
    
    await interaction.reply({
        content: '📊 Please select a month for your step count summary:',
        components: [monthRow],
        flags: 64 // ephemeral flag
    });
}

    } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'date_select') {
            const selectedDate = interaction.values[0];
            
            // Create modal for steps input only
            const modal = new ModalBuilder()
                .setCustomId(`steps_modal_${selectedDate}`)
                .setTitle(`Update Steps for ${selectedDate}`);

            // Create steps input
            const stepsInput = new TextInputBuilder()
                .setCustomId('steps_input')
                .setLabel('Number of Steps')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('10000')
                .setRequired(true)
                .setMaxLength(6);

            const stepsRow = new ActionRowBuilder().addComponents(stepsInput);
            modal.addComponents(stepsRow);

            await interaction.showModal(modal);
        } else if (interaction.customId === 'month_select') {
            await interaction.deferReply({ flags: 64 }); // ephemeral flag
            
            const selectedMonth = interaction.values[0];
            
            try {
                const monthlyData = await getMonthlyData(selectedMonth);
                const summary = analyzeMonthlySummary(monthlyData, selectedMonth);
                const summaryMessage = formatSummaryMessage(summary);
                
                await interaction.editReply({
                    content: summaryMessage,
                    flags: 64 // ephemeral flag
                });
            } catch (error) {
                console.error('Error generating summary:', error);
                await interaction.editReply({
                    content: '❌ An error occurred while generating the summary. Please try again later.',
                    flags: 64 // ephemeral flag
                });
            }
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('steps_modal_')) {
            await interaction.deferReply({ flags: 64 }); // ephemeral flag
            
            const date = interaction.customId.replace('steps_modal_', '');
            const steps = interaction.fields.getTextInputValue('steps_input');
            
            // Validate steps (must be a positive number)
            const stepsNum = parseInt(steps);
            if (isNaN(stepsNum) || stepsNum < 0) {
                await interaction.editReply({
                    content: '❌ Invalid steps count! Please enter a positive number.',
                    flags: 64 // ephemeral flag
                });
                return;
            }
            
            // Update spreadsheet
            try {
                const result = await updateStepsData(date, stepsNum);
                
                if (result.updated) {
                    const actionText = result.action === 'updated' ? 'updated' : 
                                     result.action === 'created' ? 'added' : 'recorded';
                    await interaction.editReply({
                        content: `✅ Successfully ${actionText} step count!\n📅 Date: ${date}\n👣 Steps: ${stepsNum.toLocaleString()}`,
                        flags: 64 // ephemeral flag
                    });
                } else {
                    await interaction.editReply({
                        content: `❌ Failed to update spreadsheet: ${result.error}`,
                        flags: 64 // ephemeral flag
                    });
                }
            } catch (error) {
                console.error('Error in modal submission:', error);
                await interaction.editReply({
                    content: '❌ An error occurred while updating the spreadsheet. Please try again later.',
                    flags: 64 // ephemeral flag
                });
            }
        }
    }
    
});

// Handle message mentions with detailed debugging
client.on('messageCreate', async message => {
    // Debug: Log all messages (remove this later)
    console.log(`Message from ${message.author.username}: ${message.content}`);
    
    // Ignore messages from bots
    if (message.author.bot) {
        console.log('Ignoring bot message');
        return;
    }
    
    // Debug: Check if bot is mentioned
    console.log(`Bot mentioned: ${message.mentions.has(client.user)}`);
    console.log(`Mentions array:`, message.mentions.users.map(user => user.username));
    
    // Check if the bot is mentioned
    if (message.mentions.has(client.user)) {
        console.log('Bot was mentioned! Processing...');
        
        // Get the message content without the mention
        const content = message.content.replace(`<@${client.user.id}>`, '').trim().toLowerCase();
        console.log(`Content after removing mention: "${content}"`);
        
        // Handle different mention commands
        if (content.includes('hello') || content.includes('hi') || content.includes('hey')) {
            console.log('Responding to hello');
            const greetings = [
                '👋 Hello there! This bot is being created with the intention of helping reduce Chika\'s body-fat. It is currently under maintenance. Meanwhile, u can check the other features of this App- try metioning @Adi_bot'
            ];
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            await message.reply(randomGreeting);
            
        } else if (content.includes('update counts') || content.includes('updatecounts')) {
            console.log('Responding to update counts');
            await message.reply('📊 To update step counts, please use the `/updatecounts` slash command for a better experience!');
            
        } else if (content.includes('chika')) {
            console.log('Responding to chika');
            const chikaMsgs = [
                '👋 Hello there! I\'m Chika!..The chiklet🥱',
                '✨ Hey! Chika here, ready to brighten your day!',
                '🌟 Chika reporting for duty! How can I help?',
                '😊 It\'s me, Chika! Hope you\'re doing great!'
            ];
            const randomChika = chikaMsgs[0];
            await message.reply(randomChika);
            
        } else if (content.includes('goodbye') || content.includes('bye')) {
            console.log('Responding to goodbye');
            const farewells = [
                '👋 Goodbye! See you later!',
                '🌙 Farewell! Have a wonderful rest of your day!',
                '✨ Until next time! Take care!',
                '😊 Bye for now! Hope to see you again soon!',
                '🎉 Catch you later! Stay awesome!',
                '💫 See you around! Have a great time!'
            ];
            const randomFarewell = farewells[Math.floor(Math.random() * farewells.length)];
            await message.reply(randomFarewell);
            
        } else if (content.includes('goodnight') || content.includes('night')) {
            console.log('Responding to goodnight');
            const farewells = [
                '😘💕🫂 Good night! 🌟 Sleep tight 😴 and sweet dreams 💫 chika 😘💕🫂',
                '😘💕🫂 Rest well 🛏️ and wake up refreshed ☀️ Good night! chika 🌙 😘💕🫂',
                '😘💕🫂 Wishing you a peaceful night 🌌 and cozy sleep chika 😌 😘💕🫂',
                '😘💕🫂 Sweet dreams 🌠 See you in the morning sunshine 🌞 😘💕🫂'
            ];
            const randomFarewell = farewells[Math.floor(Math.random() * farewells.length)];
            await message.reply(randomFarewell);
            
        } else if (content.includes('goodmorning') || content.includes('Good Morning') || content.includes('Good morning') || content.includes('Goodmorning') || content.includes('morning')) {
            console.log('Responding to goodmorning');
            const farewells = [
                '🌞 Good Morning! Wishing you a day full of smiles and success! 💫',
                '☀️ Rise and shine! May your day be as bright as your smile 😊',
                "🌻 Good morning, sunshine! Let's make today amazing 💛",
                '🌅 A fresh morning, a fresh start. Have a beautiful day! 🍃',
                '🌼 Good morning! Sending positive vibes and warm hugs your way 🤗'
            ];
            const randomFarewell = farewells[Math.floor(Math.random() * farewells.length)];
            await message.reply(randomFarewell);
            
        } else if (content.includes('emoji')) {
            console.log('Responding to emoji');
            const emojimsg = '❤️❤️🫂❤️❤️\n😘😘❤️🥰🥰\n🥰🥰❤️😘😘\n❤️❤️🫂❤️❤️';
            await message.reply(emojimsg);
            
        } else {
            console.log('Responding with default message');
            // Default response when mentioned but no specific command
await message.reply('👋 Hey! You mentioned me! Try saying:\n• `@' + client.user.username + ' hello`\n• `@' + client.user.username + ' chika`\n• `@' + client.user.username + ' goodbye`\n• `@' + client.user.username + ' goodnight`\n• `@' + client.user.username + ' emoji`\n• Use `/updatecounts` to update step data\n• Use `/summarize` to get monthly summary');        }
    }

    keepAlive(); // Start keep-alive mechanism
});

// Login to Discord with your client's token
client.login(TOKEN);

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});