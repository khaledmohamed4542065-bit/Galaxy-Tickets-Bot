import dotenv from 'dotenv'; 
dotenv.config({ override: true });

const config = {
    token: process.env.BOT_TOKEN,
    allowedServers: (process.env.ALLOW_SERVER || '').split(',').map(id => id.trim()).filter(id => id.length > 0),
    welcomeChannel: process.env.WELCOME_CHANNEL_ID || '1494164521038905397',
    
    // Ticket System Config
    ticketChannelId: process.env.TICKET_CHANNEL_ID || '1494164521885892735',
    openCategoryId: process.env.OPEN_CATEGORY_ID || '1494164521885892734',
    closedCategoryId: process.env.CLOSED_CATEGORY_ID || '1494164522259452085',
    logsChannelId: process.env.LOGS_CHANNEL_ID || '1495997835387076729',
    claimChannelId: process.env.CLAIM_CHANNEL_ID || '1496046810010091602',
    allowedTicketRoles: (process.env.ALLOWED_TICKET_ROLES || '1524375812663672973')
        .split(',').map(id => id.trim()).filter(id => id.length > 0)
};

export default config;  
