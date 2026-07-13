import { Client, GatewayIntentBits } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import config from './config/config.js';
import interactionCreate from './events/interactionCreate.js';
import { ensureFonts } from './utils/fontLoader.js';
import { initTicketSystem } from './ticket/initTicketSystem.js';

console.log('🚀 Initializing Galaxy Ticket Bot...');

// Pre-load fonts asynchronously on boot
ensureFonts().then(() => {
    console.log('✨ Custom fonts initialized successfully.');
}).catch(err => {
    console.error('❌ Failed to initialize fonts:', err);
});

// Database Connection
const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
if (!mongoUrl) {
    console.error('❌ Error: MONGO_URL is missing in .env file!');
    process.exit(1);
}

mongoose.connect(mongoUrl)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// Initialize Client with necessary intents and REST timeout
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    rest: {
        timeout: 60000 // 60 seconds to prevent file upload timeouts
    }
});

// Event Handlers
client.on('interactionCreate', interactionCreate);

client.on('guildCreate', async (guild) => {
    console.log(`📥 Added to a new server: "${guild.name}" (ID: ${guild.id})`);
    if (config.allowedServers.length > 0 && !config.allowedServers.includes(guild.id)) {
        console.warn(`⚠️ New server "${guild.name}" (${guild.id}) is not allowed! Leaving immediately...`);
        await guild.leave()
            .then(() => console.log(`✅ Left unauthorized new server: "${guild.name}" (${guild.id})`))
            .catch(err => console.error(`❌ Failed to leave unauthorized server:`, err.message));
    }
});

client.once('ready', async () => {
    console.log(`====================================================`);
    console.log(`✅ Galaxy Ticket Bot is READY as ${client.user.tag}`);
    console.log(`🌐 Allowed Servers: ${config.allowedServers.join(', ') || 'ALL SERVERS'}`);
    console.log(`💬 Ticket Channel ID: ${config.ticketChannelId}`);
    console.log(`====================================================`);

    // Verify existing servers and leave unauthorized ones
    const guilds = client.guilds.cache;
    console.log(`📡 Bot is currently in ${guilds.size} server(s):`);
    guilds.forEach(guild => {
        console.log(`   - Name: "${guild.name}" | ID: ${guild.id}`);
    });
    console.log(`====================================================`);

    if (config.allowedServers.length > 0) {
        for (const [id, guild] of guilds) {
            if (!config.allowedServers.includes(id)) {
                console.warn(`⚠️ Leaving unauthorized server: "${guild.name}" (ID: ${id})`);
                await guild.leave()
                    .then(() => console.log(`✅ Successfully left: "${guild.name}" (${id})`))
                    .catch(err => console.error(`❌ Failed to leave:`, err.message));
            }
        }
        console.log(`====================================================`);
    }

    // Initialize/Refresh Ticket System Embed
    await initTicketSystem(client, config);
});

client.on('error', (err) => console.error('❌ Discord Client Error:', err));
process.on('unhandledRejection', (error) => console.error('⚠️ Unhandled Promise Rejection:', error));

if (!config.token || config.token.trim() === '') {
    console.error('❌ Error: BOT_TOKEN is missing or not configured in .env file!');
    process.exit(1);
}

client.login(config.token);
