import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import config from '../config/config.js';
import { 
    handleCreateTicket, 
    confirmTicketCreation, 
    handleCloseTicket, 
    executeCloseTicket, 
    handleClaimTicket, 
    handleReopenTicket, 
    handleDeleteTicket,
    getAllowedRoles 
} from '../ticket/ticketManager.js';
import { getTicketByChannelId } from '../ticket/database.js';

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

            // Staff check helper
            const checkIsStaff = async () => {
                const allowedRoles = await getAllowedRoles(interaction.guild.id);
                return interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                       interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));
            };

            // Enforce staff restrictions for claim, reopen, delete
            const staffButtons = ['ticket_claim', 'ticket_open', 'ticket_delete'];
            if (staffButtons.includes(interaction.customId)) {
                const isStaff = await checkIsStaff();
                if (!isStaff) {
                    return interaction.reply({ 
                        content: '❌ هذا الزر مخصص لأعضاء الدعم الفني فقط.', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }
            }

            // Enforce owner OR staff restrictions for closing tickets
            if (interaction.customId === 'ticket_close' || interaction.customId === 'ticket_close_confirm_yes') {
                const ticket = await getTicketByChannelId(interaction.channelId);
                const isStaff = await checkIsStaff();
                const isOwner = ticket && ticket.userId === interaction.user.id;
                
                if (!isStaff && !isOwner) {
                    return interaction.reply({ 
                        content: '❌ هذا الإجراء مخصص لصاحب التيكيت أو أعضاء الدعم الفني فقط.', 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }
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
