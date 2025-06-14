const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

const express = require('express');
// Bot configuration
const TOKEN = 'MTM4MzQ1OTQxMzQyNzIyODcyMg.GVhU6G.vMTMVD7nDwUIJxM_PDrDl32rAequTZZf1Ss3Gg';
const CLIENT_ID = '1383459413427228722';


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
    if (!interaction.isChatInputCommand()) return;

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
    }
    else if (interaction.commandName === 'emoji') {
        const emojimsg = [
            '❤️❤️🫂❤️❤️\n😘😘❤️🥰🥰\n🥰🥰❤️😘😘\n❤️❤️🫂❤️❤️'
        ];
        
        const emojirandom = emojimsg[0];
        
        await interaction.reply({
            content: emojirandom,
            ephemeral: false
        });
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
            
        } 
        
        else if (content.includes('chika')) {
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
            
        }else if (content.includes('goodnight') || content.includes('night')) {
            console.log('Responding to goodnight');
            const farewells = [
                '😘💕🫂 Good night! 🌟 Sleep tight 😴 and sweet dreams 💫 chika 😘💕🫂',
	            '😘💕🫂 Rest well 🛏️ and wake up refreshed ☀️ Good night! chika 🌙 😘💕🫂',
		        '😘💕🫂 Wishing you a peaceful night 🌌 and cozy sleep chika 😌 😘💕🫂',
	        	'😘💕🫂 Sweet dreams 🌠 See you in the morning sunshine 🌞 😘💕🫂'
            ];
            const randomFarewell = farewells[Math.floor(Math.random() * farewells.length)];
            await message.reply(randomFarewell);
            
        }else if (content.includes('goodmorning') || content.includes('Good Morning') || content.includes('Good morning') || content.includes('Goodmorning') || content.includes('morning')) {
            console.log('Responding to goodnight');
            const farewells = [
                '🌞 Good Morning! Wishing you a day full of smiles and success! 💫',
                '☀️ Rise and shine! May your day be as bright as your smile 😊',
                '🌻 Good morning, sunshine! Let’s make today amazing 💛',
                '🌅 A fresh morning, a fresh start. Have a beautiful day! 🍃',
                '🌼 Good morning! Sending positive vibes and warm hugs your way 🤗'
            ];
            const randomFarewell = farewells[Math.floor(Math.random() * farewells.length)];
            await message.reply(randomFarewell);
            
        }
        //  else if (content.includes('test')) {
        //     console.log('Responding to testing');
        //     const testmsg = 'this is just a testing message';
        //     await message.reply(testmsg);
            
        // }
        
        else if (content.includes('emoji')) {
            console.log('Responding to emoji');
            const emojimsg = '❤️❤️🫂❤️❤️\n😘😘❤️🥰🥰\n🥰🥰❤️😘😘\n❤️❤️🫂❤️❤️';
            await message.reply(emojimsg);
            
        } else {
            console.log('Responding with default message');
            // Default response when mentioned but no specific command
            await message.reply('👋 Hey! You mentioned me! Try saying:\n• `@' + client.user.username + ' hello`\n• `@' + client.user.username + ' chika`\n• `@' + client.user.username + ' goodbye`\n• `@' + client.user.username + ' goodnight`\n• `@' + client.user.username + ' emoji`');
        }
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