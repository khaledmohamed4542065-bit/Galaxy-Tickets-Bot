import { 
    PermissionFlagsBits, 
    ChannelType, 
    EmbedBuilder,
    Colors, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { initTicketSystem } from './initTicketSystem.js';
import config from '../config/config.js';
import { userCloseRow, closeConfirmRow, closeConfirmRowClose, ticketControlsRow, supportControlsRow, closedEmbed, claimPromptRow, claimPromptEmbed, claimedInTicketEmbed, claimedInClaimChannelEmbed, ticketClosedDMEmbed } from './buttonsHandler.js';
import { getNextTicketId, createTicket, getUserOpenTicket, getTicketByChannelId, updateTicketStatus, claimTicket, updateClaimPromptMessageId } from './database.js';
import GuildSettings from '../models/GuildSettings.js';

export { initTicketSystem };

// Helper to get allowed roles from DB
export const getAllowedRoles = async (guildId) => {
    const settings = await GuildSettings.findOne({ guildId });
    return settings?.allowedTicketRoles && settings.allowedTicketRoles.length > 0 
        ? settings.allowedTicketRoles 
        : config.allowedTicketRoles;
};

export const handleCreateTicket = async (interaction) => {
    await sendStructuredLog(interaction.guild, 'create_start', { userId: interaction.user.id, details: `User: ${interaction.user.tag}` });
    
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (deferErr) {
        await sendStructuredLog(interaction.guild, 'defer_failed', { userId: interaction.user.id, details: deferErr.message });
        return;
    }
    
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    await sendStructuredLog(interaction.guild, 'spam_check', { userId, details: 'Checking open ticket' });
    let openTicket;
    try {
        openTicket = await getUserOpenTicket(userId, guildId);
    } catch (dbErr) {
        await sendStructuredLog(interaction.guild, 'db_error', { userId, details: `Spam check DB: ${dbErr.message}` });
    }
    
    if (openTicket) {
        const channel = interaction.guild.channels.cache.get(openTicket.channelId);
        if (!channel) {
            await updateTicketStatus(openTicket.channelId, 'closed', interaction.user.id);
            const cleanEmbed = new EmbedBuilder()
                .setDescription('تم تنظيف تيكت قديم محذوف تلقائياً ✅\nيمكنك فتح تيكت جديد.')
                .setColor('#8B2FF3');
            await interaction.editReply({ embeds: [cleanEmbed] });
            await sendStructuredLog(interaction.guild, 'old_ticket_cleaned', { userId, ticketId: openTicket.ticketId });
            return;
        }
        await sendStructuredLog(interaction.guild, 'spam_detected', { userId, ticketId: openTicket.ticketId });
        const spamEmbed = new EmbedBuilder()
            .setDescription(`لديك تيكيت مفتوح: <#${openTicket.channelId}> 🎫`)
            .setColor('#8B2FF3');
        await interaction.editReply({ embeds: [spamEmbed] });
        return;
    }
    
    await sendStructuredLog(interaction.guild, 'no_spam_confirm', { userId, details: 'Sending confirm' });
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🎫 تأكيد فتح تيكت')
        .setDescription('هل أنت متأكد؟')
        .setColor('#8B2FF3');
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_confirm_yes').setLabel('Yes ✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_confirm_no').setLabel('No').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
    await sendStructuredLog(interaction.guild, 'confirm_sent', { userId });
};

export const confirmTicketCreation = async (interaction) => {
    try {
        // Defer update immediately to prevent Unknown interaction (3-second limit)
        await interaction.deferUpdate();
    } catch (e) {
        console.error('Failed to defer ticket creation confirm:', e);
    }

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const ticketId = await getNextTicketId(guildId);
    
    const channel = await interaction.guild.channels.create({
        name: `ticket-${ticketId}`,
        type: ChannelType.GuildText,
        parent: config.openCategoryId,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: userId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            },
            // Management initially CANNOT see the ticket
            ...(await getAllowedRoles(guildId)).map(roleId => ({
                id: roleId,
                deny: [PermissionFlagsBits.ViewChannel]
            }))
        ]
    });

    const ticketData = {
        guildId,
        ticketId,
        userId,
        channelId: channel.id
    };

    await createTicket(ticketData);
    const ticket = await getTicketByChannelId(channel.id);

    // Mention msg separate
    await channel.send(`<@${userId}> Please wait for support team response... 🎫`);

    // Welcome Row (No claim button here anymore)
    const welcomeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التيكيت').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );
    
    const welcome = new EmbedBuilder()
        .setTitle('🎫 مرحباً بك!')
        .setDescription(`أهلاً بك <@${userId}>، سيتم الرد عليك قريباً من قبل فريق الدعم.\nيمكنك الضغط على الزر أدناه لإغلاق التيكيت إذا انتهيت.`)
        .setColor('#8B2FF3')
        .setTimestamp();

    await channel.send({
        embeds: [welcome],
        components: [welcomeRow]
    });

    // Use editReply instead of update because we deferred the interaction
    await interaction.editReply({ content: `تم فتح التيكيت بنجاح: ${channel} 🎫`, components: [], embeds: [] });

    // Send Claim Prompt to management channel
    const claimChannel = interaction.guild.channels.cache.get(config.claimChannelId);
    if (claimChannel) {
        const allowedRoles = await getAllowedRoles(guildId);
        const pingRoles = allowedRoles.map(roleId => `<@&${roleId}>`).join(' ');
        const promptMsg = await claimChannel.send({
            content: `📢 تيكيت جديد بانتظار الاستلام! ${pingRoles} @here`,
            embeds: [claimPromptEmbed(ticket)],
            components: [claimPromptRow()]
        });
        await updateClaimPromptMessageId(channel.id, promptMsg.id);
    }

    // Log
    await sendStructuredLog(interaction.guild, 'ticket_created', { userId, ticketId, channel: channel.id });
};

export const handleCloseTicket = async (interaction) => {
    try {
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🔒 Close Confirmation')
            .setDescription('Are you sure to close ticket?')
            .setColor('#8B2FF3');

        await interaction.reply({ 
            embeds: [confirmEmbed], 
            components: [closeConfirmRowClose()], 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error in handleCloseTicket:', error);
        try {
            await interaction.reply({ content: '❌ فشلت عملية إغلاق التيكيت.', ephemeral: true }).catch(async () => {
                await interaction.followUp({ content: '❌ فشلت عملية إغلاق التيكيت.', ephemeral: true });
            });
        } catch {}
    }
};

export const executeCloseTicket = async (interaction) => {
    try {
        // Defer update immediately to prevent 3-second timeout
        await interaction.deferUpdate();
    } catch (e) {
        console.error('Failed to defer close execution:', e);
    }

    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket) {
        const errEmbed = new EmbedBuilder()
            .setDescription('Ticket not found!')
            .setColor('#8B2FF3');
        try {
            return await interaction.editReply({ embeds: [errEmbed], components: [] });
        } catch (e) {
            console.error('Failed to editReply for ticket-not-found:', e);
            try {
                return await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
            } catch {}
        }
    }

    // Complete deny user access
    if (ticket.userId) {
        await interaction.channel.permissionOverwrites.edit(ticket.userId.toString(), {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
        }, { reason: 'Ticket closed' }).catch(err => console.error(`Failed to remove perms for user ${ticket.userId}:`, err));
    }

    // Lock everyone SendMessages (@everyone role)
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { 
        SendMessages: false 
    }).catch(err => console.error('Failed to lock everyone perms:', err));

    // Move user to welcome channel if in voice
    try {
        const welcomeChannel = interaction.guild.channels.cache.get(config.welcomeChannel);
        const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
        
        // Send DM to user
        if (member) {
            await member.send({ embeds: [ticketClosedDMEmbed(ticket, interaction.user, interaction.guild)] }).catch(() => {
                console.log(`Could not send DM to user ${ticket.userId}`);
            });

            if (member.voice.channel && welcomeChannel) {
                await member.voice.setChannel(welcomeChannel).catch(() => {});
            }
        }
    } catch (err) {
        console.error('Failed to process voice channel / DM movement:', err);
    }

    // Update DB
    try {
        await updateTicketStatus(interaction.channelId, 'closed', interaction.user.id);
    } catch (err) {
        console.error('Failed to update ticket status in DB:', err);
    }

    // Rename
    try {
        await interaction.channel.setName(`closed-${ticket.ticketId}`);
    } catch (err) {
        console.error(`Failed to rename channel to closed-${ticket.ticketId}:`, err);
    }

    // Move category
    if (config.closedCategoryId) {
        try {
            await interaction.channel.setParent(config.closedCategoryId);
        } catch (err) {
            console.error(`Failed to set channel parent to closed category (${config.closedCategoryId}):`, err);
        }
    }

    // Send closed embed
    try {
        await interaction.channel.send({ embeds: [closedEmbed(interaction.user.id)] });
    } catch (err) {
        console.error('Failed to send closed embed:', err);
    }

    // Support controls
    try {
        await interaction.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('Support team ticket controls')
                .setDescription('```\n[Copy this block for logs]\n```')
                .setColor('#8B2FF3')
            ],
            components: [supportControlsRow()]
        });
    } catch (err) {
        console.error('Failed to send support controls:', err);
    }

    // Use editReply instead of update because we deferred the interaction
    try {
        const closeSuccessEmbed = new EmbedBuilder()
            .setDescription('✅ Ticket closed')
            .setColor('#8B2FF3');
        await interaction.editReply({ embeds: [closeSuccessEmbed], components: [] });
    } catch (err) {
        console.error('Failed to edit reply for close success:', err);
    }

    try {
        await sendStructuredLog(interaction.guild, 'ticket_closed', { userId: interaction.user.id, ticketId: ticket.ticketId, channel: interaction.channelId });
    } catch (err) {
        console.error('Failed to send structured log:', err);
    }
};

export const handleClaimTicket = async (interaction) => {
    try {
        // Defer update immediately to prevent 3-second timeout
        await interaction.deferUpdate();
    } catch (e) {
        console.error('Failed to defer claim:', e);
    }

    const ticket = await getTicketByChannelId(interaction.channelId || interaction.message.channelId);
    
    // Find the actual ticket if the interaction is from the claim channel
    let targetTicket = ticket;
    if (!targetTicket && interaction.channelId === config.claimChannelId) {
        const TicketModel = (await import('../models/Ticket.js')).default;
        targetTicket = await TicketModel.findOne({ claimPromptMessageId: interaction.message.id });
    }

    if (!targetTicket) {
        return interaction.followUp({ content: 'عذراً، لم يتم العثور على التيكيت فى قاعدة البيانات.', ephemeral: true });
    }

    if (targetTicket.claimedBy) {
        const claimedEmbed = new EmbedBuilder()
            .setDescription(`عذراً، هذا التيكيت تم استلامه بالفعل من قبل <@${targetTicket.claimedBy}>!`)
            .setColor('#8B2FF3');
        return interaction.followUp({ embeds: [claimedEmbed], ephemeral: true });
    }

    const newTicket = await claimTicket(targetTicket.channelId, interaction.user.id);
    if (!newTicket) {
        return interaction.followUp({ content: 'فشل استلام التيكيت، ربما استلمه شخص آخر بالفعل.', ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(targetTicket.channelId);
    if (ticketChannel) {
        const allowedRoles = await getAllowedRoles(interaction.guild.id);
        // Reveal channel to all management roles
        for (const roleId of allowedRoles) {
            await ticketChannel.permissionOverwrites.edit(roleId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                ManageChannels: true
            }).catch(e => console.error(`Failed to update perms for role ${roleId}:`, e));
        }

        // Send claim embed in ticket channel
        await ticketChannel.send({ embeds: [claimedInTicketEmbed(interaction.user, targetTicket)] });
    }

    // Update claim message in claim channel using editReply
    if (interaction.channelId === config.claimChannelId) {
        await interaction.editReply({
            content: `✅ تم استلام التيكيت بواسطة <@${interaction.user.id}>`,
            embeds: [claimedInClaimChannelEmbed(targetTicket, interaction.user)],
            components: [] // Hide buttons
        });
    } else {
        await interaction.followUp({ content: '✅ تم استلام التيكيت بنجاح!', ephemeral: true });
    }

    await sendStructuredLog(interaction.guild, 'ticket_claimed', { userId: interaction.user.id, ticketId: targetTicket.ticketId, channel: targetTicket.channelId });
};

export const handleReopenTicket = async (interaction) => {
    try {
        // Defer reply immediately since it's a slow operation
        await interaction.deferReply({ ephemeral: true });
    } catch (e) {
        console.error('Failed to defer reopen:', e);
    }

    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket || ticket.status !== 'closed') {
        return interaction.editReply({ content: 'Ticket is already open or not found!' });
    }

    await updateTicketStatus(interaction.channelId, 'open', interaction.user.id);
    await interaction.channel.setName(`ticket-${ticket.ticketId}`);
    await interaction.channel.setParent(config.openCategoryId);

    // Restore user perms + mention
    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });
    await interaction.channel.send(`<@${ticket.userId}> Ticket reopened! 🔓`);

    // Use editReply because we deferred the reply
    await interaction.editReply({ content: `**Ticket reopened by <@${interaction.user.id}>**` });

    await sendStructuredLog(interaction.guild, 'ticket_reopened', { userId: interaction.user.id, ticketId: ticket.ticketId, channel: interaction.channelId });
};

export const handleDeleteTicket = async (interaction) => {
    try {
        await interaction.deferUpdate();
    } catch (e) {
        console.error('Failed to defer delete:', e);
    }

    const ticket = await getTicketByChannelId(interaction.channelId);
    await sendStructuredLog(interaction.guild, 'ticket_deleted', { userId: interaction.user.id, ticketId: ticket?.ticketId || 'N/A', channel: interaction.channelId });
    await updateTicketStatus(interaction.channelId, 'closed', interaction.user.id);
    await interaction.channel.delete();
};

const sendStructuredLog = async (guild, event, data = {}) => {
    try {
        const logChannel = guild.channels.cache.get(config.logsChannelId);
        if (!logChannel) return;

        const client = guild.client;
        const user = data.userId ? await client.users.fetch(data.userId).catch(() => null) : null;

        let titleEmoji = '📋', color = 0x2F3136, titleText = event;
        switch(event.toLowerCase()) {
            case 'ticket_created': titleEmoji = '🎫'; color = 0x2ECC71; titleText = 'فتح تيكيت جديد'; break;
            case 'ticket_closed': titleEmoji = '🔒'; color = 0xE74C3C; titleText = 'تم إغلاق التيكيت'; break;
            case 'ticket_claimed': titleEmoji = '✅'; color = 0x3498DB; titleText = 'تم استلام التيكيت'; break;
            case 'ticket_reopened': titleEmoji = '🔓'; color = 0xF1C40F; titleText = 'إعادة فتح التيكيت'; break;
            case 'ticket_deleted': titleEmoji = '🗑️'; color = 0x95A5A6; titleText = 'حذف التيكيت نهائياً'; break;
            case 'spam_detected': titleEmoji = '❌'; color = 0xE67E22; titleText = 'كشف محاولة سبام'; break;
            case 'old_ticket_cleaned': titleEmoji = '🧹'; color = 0x1ABC9C; titleText = 'تنظيف تيكيت قديم'; break;
            case 'db_error': titleEmoji = '⚠️'; color = 0x992D22; titleText = 'خطأ في قاعدة البيانات'; break;
            case 'defer_failed': titleEmoji = '⚠️'; color = 0x992D22; titleText = 'فشل الرد السريع'; break;
            default: titleEmoji = '📑'; color = 0x2F3136; titleText = event;
        }

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: user ? `${user.tag} (${user.id})` : 'نظام التيكيت', 
                iconURL: user ? user.displayAvatarURL({ dynamic: true }) : client.user.displayAvatarURL() 
            })
            .setTitle(`${titleEmoji} ${titleText}`)
            .setColor(color)
            .setThumbnail(user ? user.displayAvatarURL({ dynamic: true, size: 256 }) : client.user.displayAvatarURL())
            .addFields(
                { name: '👤 المنفذ/المستخدم', value: data.userId ? `<@${data.userId}>` : '`System`', inline: true },
                { name: '🎫 التيكيت', value: data.ticketId ? `\`#${data.ticketId}\`` : data.channel ? `<#${data.channel}>` : '`N/A`', inline: true }
            )
            .setFooter({ 
                text: `${guild.name} • سجلات التيكيت`, 
                iconURL: client.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        if (data.details) {
            embed.addFields({ name: '📝 تفاصيل إضافية', value: `\`\`\`\n${data.details}\n\`\`\``, inline: false });
        }

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Structured log failed:', err);
    }
};
