import { PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config/config.js';
import GuildSettings from '../models/GuildSettings.js';
import { getAllowedRoles } from '../ticket/ticketManager.js';

export default async (message) => {
    // Basic checks
    if (!message.guild) return;
    if (message.author.bot) return;

    // Whitelist check
    if (config.allowedServers.length > 0 && !config.allowedServers.includes(message.guild.id)) return;

    const content = message.content.trim();
    const args = content.split(/\s+/);
    const cmd = args[0].toLowerCase();

    // Check command name (with or without prefix !)
    if (cmd === 'add-ticket-perm' || cmd === '!add-ticket-perm' || cmd === 'add-t-perm' || cmd === '!add-t-perm') {
        try {
            // Check if member is Administrator
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ ليس لديك صلاحية استخدام هذا الأمر (مطلوب صلاحية المسؤول).');
            }

            const roleArgs = args.slice(1);
            if (roleArgs.length === 0) {
                return message.reply('❌ الرجاء تحديد رول واحدة على الأقل أو معرف رول (ID).\nمثال: `!add-t-perm @Role` أو `!add-t-perm 123456789012345678`');
            }

            const addedRoles = [];
            const invalidRoles = [];

            for (const arg of roleArgs) {
                // Check if mention format: <@&ROLE_ID>
                const match = arg.match(/^<@&(\d+)>$/);
                const roleId = match ? match[1] : arg;

                if (/^\d+$/.test(roleId)) {
                    // Try to fetch/get the role to verify it exists
                    const role = message.guild.roles.cache.get(roleId) || await message.guild.roles.fetch(roleId).catch(() => null);
                    if (role) {
                        addedRoles.push(role);
                    } else {
                        invalidRoles.push(arg);
                    }
                } else {
                    invalidRoles.push(arg);
                }
            }

            if (addedRoles.length === 0) {
                return message.reply('❌ لم يتم العثور على رولات صالحة في الخادم. تأكد من منشن الرول بشكل صحيح أو كتابة الـ ID الخاص بها.');
            }

            // Find or create GuildSettings
            let settings = await GuildSettings.findOne({ guildId: message.guild.id });
            if (!settings) {
                settings = new GuildSettings({
                    guildId: message.guild.id,
                    guildName: message.guild.name,
                    allowedTicketRoles: []
                });
            }

            // Add new roles while keeping existing ones, removing duplicates
            const currentRoles = settings.allowedTicketRoles || [];
            const newRoleIds = addedRoles.map(r => r.id);
            const updatedRoles = [...new Set([...currentRoles, ...newRoleIds])];

            settings.allowedTicketRoles = updatedRoles;
            await settings.save();

            // Format success message with pings + @here
            const pingAdded = addedRoles.map(r => `<@&${r.id}>`).join(' ');
            let response = `✅ تم إضافة الرولات التالية للتحكم بالتذاكر بنجاح: ${pingAdded} @here`;
            
            if (invalidRoles.length > 0) {
                response += `\n⚠️ لم يتم العثور على هذه الرتب/المعرفات: ${invalidRoles.join(', ')}`;
            }

            return message.reply(response);
        } catch (error) {
            console.error('Error in add-ticket-perm command:', error);
            return message.reply('❌ حدث خطأ أثناء محاولة حفظ الإعدادات في قاعدة البيانات.');
        }
    }

    if (cmd === 'rm-ticket-perm' || cmd === '!rm-ticket-perm' || cmd === 'rm-t-perm' || cmd === '!rm-t-perm') {
        try {
            // Check if member is Administrator
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ ليس لديك صلاحية استخدام هذا الأمر (مطلوب صلاحية المسؤول).');
            }

            const allowedRoles = await getAllowedRoles(message.guild.id);
            if (!allowedRoles || allowedRoles.length === 0) {
                return message.reply('❌ لا توجد أي رتب مسموح لها حالياً في قاعدة البيانات لإزالتها.');
            }

            const options = [];
            for (const roleId of allowedRoles) {
                const role = message.guild.roles.cache.get(roleId) || await message.guild.roles.fetch(roleId).catch(() => null);
                const label = role ? role.name : `Unknown Role (${roleId})`;
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(label)
                        .setValue(roleId)
                );
            }

            // Slice at 25 as that's the Discord select menu limit
            const slicedOptions = options.slice(0, 25);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_rm_perm_select')
                .setPlaceholder('اختر الرولات لحذفها')
                .setMinValues(1)
                .setMaxValues(slicedOptions.length)
                .addOptions(slicedOptions);

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);

            const deleteBtn = new ButtonBuilder()
                .setCustomId('ticket_rm_perm_btn')
                .setLabel('حذف الرولات المحددة 🗑️')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true); // Disabled initially

            const btnRow = new ActionRowBuilder().addComponents(deleteBtn);

            await message.reply({
                content: '📋 الرجاء اختيار الرتب التي تريد إزالتها من الصلاحيات، ثم اضغط على زر الحذف:',
                components: [selectRow, btnRow]
            });
        } catch (error) {
            console.error('Error in rm-ticket-perm command:', error);
            return message.reply('❌ حدث خطأ أثناء معالجة الطلب.');
        }
    }
};
