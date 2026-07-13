import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

export const createTicketSelectMenu = () => {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('اختر نوع التذكرة')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('دعم عام').setDescription('استفسار أو مشكلة عامة').setValue('general_support').setEmoji('💬')
            )
    );
};

export const closeConfirmRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_confirm_yes').setLabel('نعم').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_confirm_no').setLabel('لا').setStyle(ButtonStyle.Secondary)
    );
};

export const closeConfirmRowClose = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close_confirm_yes').setLabel('نعم').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_close_confirm_no').setLabel('لا').setStyle(ButtonStyle.Secondary)
    );
};

export const userCloseRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التيكيت').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );
};

export const ticketControlsRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Primary).setEmoji('✅'),
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );
};

export const claimPromptRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام التيكيت').setStyle(ButtonStyle.Primary).setEmoji('✅')
    );
};

export const supportControlsRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open').setLabel('Open').setStyle(ButtonStyle.Success).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );
};

export const welcomeEmbed = (user) => {
    return new EmbedBuilder()
        .setTitle('🎫 مرحباً بك!')
        .setDescription('سيتم الرد عليك قريباً من فريق الدعم\nلإغلاق التيكيت اضغط زر الإغلاق')
        .setColor('#8B2FF3')
        .setFooter({ text: 'Created by Galaxy Ticket Bot' })
        .setTimestamp();
};

export const closedEmbed = (closer) => {
    return new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Ticket Closed by <@${closer}>`)
        .setColor('#8B2FF3');
};

export const claimPromptEmbed = (ticket) => {
  const createdAt = new Date(ticket.createdAt).toLocaleString('ar-EG', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
  return new EmbedBuilder()
    .setTitle('📥 تيكيت جديد بانتظار الاستلام')
    .setDescription('**يوجد تيكيت جديد مفتوح يحتاج إلى مراجعة من الإدارة**')
    .addFields(
      { name: '🆔 رقم التيكيت', value: `\`#${ticket.ticketId}\``, inline: true },
      { name: '👤 صاحب التيكيت', value: `<@${ticket.userId}>`, inline: true },
      { name: '🕒 وقت الفتح', value: createdAt, inline: false },
      { name: '📊 الحالة', value: '⏳ قيد الانتظار', inline: true },
      { name: '🔒 الرؤية', value: '👻 مخفي عن الإدارة', inline: true }
    )
    .setColor('#8B2FF3')
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/2065/2065064.png')
    .setFooter({ text: 'نظام إدارة التيكتات • يرجى الضغط على الزر أدناه للاستلام' })
    .setTimestamp();
};

export const claimedInClaimChannelEmbed = (ticket, claimer) => {
  return new EmbedBuilder()
    .setTitle('✅ تم استلام التيكيت')
    .setDescription(`**لقد قام الإداري <@${claimer.id}> باستلام هذا التيكيت بنجاح.**`)
    .addFields(
      { name: '🆔 رقم التيكيت', value: `\`#${ticket.ticketId}\``, inline: true },
      { name: '👤 المستلم', value: `<@${claimer.id}>`, inline: true },
      { name: '🕒 وقت الاستلام', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
    )
    .setColor('#8B2FF3')
    .setFooter({ text: 'تم تحديث حالة التيكيت' })
    .setTimestamp();
};

export const claimedInTicketEmbed = (claimer, ticket) => {
  return new EmbedBuilder()
    .setTitle('✅ تم استلام التيكيت')
    .setDescription(`**أهلاً بك <@${ticket.userId}>، لقد استلم الإداري طلبك وسيتم الرد عليك في أقرب وقت.**`)
    .addFields(
      { name: '👤 المستلم', value: `<@${claimer.id}>`, inline: true },
      { name: '🏷️ رقم التيكيت', value: `\`#${ticket.ticketId}\``, inline: true },
      { name: '🕒 وقت الاستلام', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
    )
    .setThumbnail(claimer.displayAvatarURL({ dynamic: true, size: 512 }))
    .setColor('#8B2FF3')
    .setFooter({ text: 'نتمنى لك تجربة سعيدة!', iconURL: claimer.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
};

export const ticketClosedDMEmbed = (ticket, closer, guild) => {
  return new EmbedBuilder()
    .setTitle('🔒 تم إغلاق التيكيت الخاص بك')
    .setDescription(`نود إعلامك بأنه تم إغلاق التيكيت الخاص بك في سيرفر **${guild.name}**.`)
    .addFields(
      { name: '🆔 رقم التيكيت', value: `\`#${ticket.ticketId}\``, inline: true },
      { name: '👤 أغلق بواسطة', value: `<@${closer.id}>`, inline: true },
      { name: '🕒 وقت الإغلاق', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    )
    .setColor('#8B2FF3')
    .setFooter({ text: `شكراً لتواصلك معنا في ${guild.name}` })
    .setTimestamp();
};
