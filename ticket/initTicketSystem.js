import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { createTicketSelectMenu } from './buttonsHandler.js';
import { generateTicketGif } from '../utils/ticketGif.js';

export const initTicketSystem = async (client, config) => {
    console.log('🔄 [TICKET INIT] Starting...');
    try {
        const channel = await client.channels.fetch(config.ticketChannelId).catch(() => null);
        if (!channel) {
            console.error('❌ [TICKET INIT] Channel not found:', config.ticketChannelId);
            return;
        }
        console.log('✅ [TICKET INIT] Channel:', channel.name);

        // Clear old ticket messages
        const messages = await channel.messages.fetch({ limit: 50 });
        await Promise.all(
            messages.filter(msg => msg.author.id === client.user.id).map(msg => 
                msg.delete().catch(console.error)
            )
        );

        // Extract option labels dynamically from the select menu
        const selectMenuRow = createTicketSelectMenu();
        const selectMenu = selectMenuRow.components[0];
        const optionLabels = selectMenu.options.map(opt => `${opt.data.emoji.name} ${opt.data.label}`);

        // Generate GIF
        console.log('🔄 [TICKET INIT] Generating GIF...');
        const guild = channel.guild;
        const iconUrl = guild.iconURL({ extension: 'png', size: 256 });
        const gifBuffer = await generateTicketGif(guild.name, iconUrl, optionLabels);
        const attachment = new AttachmentBuilder(gifBuffer, { name: 'ticket_banner.gif' });

        const embed = new EmbedBuilder()
            .setColor('#8B2FF3') 
            .setDescription(`**نظام التذاكر - ${guild.name} 🎫**\n\nمرحباً بك في نظام التذاكر!\nاختر نوع التذكرة من القائمة المنسدلة:`)
            .setImage('attachment://ticket_banner.gif')
            .setFooter({ text: 'Galaxy Ticket System', iconURL: client.user.displayAvatarURL() });

        const msg = await channel.send({ 
            embeds: [embed], 
            files: [attachment],
            components: [createTicketSelectMenu()] 
        });

        console.log('✅ [TICKET INIT] Message sent ID:', msg.id);
        
        // Refresh components every 6 hours
        setInterval(async () => {
            try {
                const freshMsg = await channel.messages.fetch(msg.id);
                if (freshMsg) {
                    await freshMsg.edit({ components: [createTicketSelectMenu()] });
                    console.log('🔄 [TICKET] Menu refreshed');
                }
            } catch (e) {
                console.error('Menu refresh failed:', e);
            }
        }, 6 * 60 * 60 * 1000); // 6 hours

    } catch (error) {
        console.error('❌ [TICKET INIT ERROR]:', error);
    }
};
