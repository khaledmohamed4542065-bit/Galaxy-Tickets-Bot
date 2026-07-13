import { EmbedBuilder, MessageFlags } from 'discord.js';
import config from '../config/config.js';
import { handleCreateTicket, confirmTicketCreation, handleCloseTicket, executeCloseTicket, handleClaimTicket, handleReopenTicket, handleDeleteTicket } from '../ticket/ticketManager.js';

export default async (interaction) => {
    // --- WHITELIST GUARD ---
    if (interaction.guild && !config.allowedServers.includes(interaction.guild.id)) return;

    if (!interaction.guild) return;

    const isTicketButton = interaction.isButton() && interaction.customId.startsWith('ticket_');
    const isTicketMenu = interaction.isStringSelectMenu() && interaction.customId === 'ticket_select';

    if (isTicketButton || isTicketMenu) {
        console.log(`🤖 Ticket Interaction received: ${interaction.customId} from user ${interaction.user.id} in channel ${interaction.channelId}`);
        try {
            if (isTicketMenu) {
                await handleCreateTicket(interaction);
                return;
            }

            switch(interaction.customId) {
                case 'ticket_confirm_yes':
                    await confirmTicketCreation(interaction);
                    break;
                case 'ticket_confirm_no':
                case 'ticket_close_confirm_no':
                    await interaction.update({ 
                        embeds: [new EmbedBuilder().setColor('#8B2FF3').setDescription('>>> **تم إلغاء العملية ✅**')], 
                        components: [] 
                    });
                    break;
                case 'ticket_close':
                    await handleCloseTicket(interaction);
                    break;
                case 'ticket_close_confirm_yes':
                    await executeCloseTicket(interaction);
                    break;
                case 'ticket_claim':
                    await handleClaimTicket(interaction);
                    break;
                case 'ticket_open':
                    await handleReopenTicket(interaction);
                    break;
                case 'ticket_delete':
                    await handleDeleteTicket(interaction);
                    break;
                default:
                    return;
            }
        } catch (error) {
            console.error('🎫 TICKET INTERACTION ERROR:', error);
            try {
                const responsePayload = { 
                    content: '❌ حدث خطأ فني أثناء معالجة الطلب، يرجى المحاولة لاحقاً.', 
                    flags: [MessageFlags.Ephemeral] 
                };
                if (interaction.replied) {
                    await interaction.followUp(responsePayload);
                } else if (interaction.deferred) {
                    await interaction.editReply(responsePayload);
                } else {
                    await interaction.reply(responsePayload);
                }
            } catch (err) {
                console.error('Failed to send error response to interaction:', err);
            }
        }
        return;
    }
};
