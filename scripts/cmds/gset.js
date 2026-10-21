const gs = require("../../utils/groupSettings.js");
module.exports = {
	config: {
		name: "gset", aliases: ["groupset", "gsettings"], version: "1.0", author: "HR ID OY", countDown: 3, role: 0,
		description: "Per-group settings: prefix, language, command on/off", category: "Group",
		guide: "{p}gset                      show this group's settings\n{p}gset prefix <new|reset>\n{p}gset lang <en|bn|hi|tl|ar|vi>\n{p}gset off <command>      switch a command off here\n{p}gset on <command>       switch it back on\n{p}gset list               commands switched off"
	},
	onStart: async function ({ message, event, args, threadsData, role, prefix }) {
		const cfg = global.GoatBot.config.groupSettings || {};
		if (cfg.enable === false) return message.reply("⚙️ Group settings are disabled in config.");
		const tid = event.threadID, td = await threadsData.get(tid), d = td.data || {};
		const sub = (args[0] || "").toLowerCase();
		const canEdit = role >= 2 || (role >= 1 && cfg.allowGroupAdmins !== false);
		if (!sub || sub === "show") {
			const off = gs.getDisabled(td);
			return message.reply(`⚙️ GROUP SETTINGS\n━━━━━━━━━━━━\n• Prefix: ${d.prefix || global.GoatBot.config.prefix}\n• Language: ${d.lang || global.GoatBot.config.language}\n• Commands off: ${off.length ? off.join(", ") : "none"}\n\nChange with ${prefix}gset prefix|lang|off|on`);
		}
		if (sub === "list") { const o = gs.getDisabled(td); return message.reply(o.length ? "🚫 Off here: " + o.join(", ") : "✅ No command is switched off."); }
		if (!canEdit) return message.reply("⛔ Only group admins can change group settings.");
		if (sub === "prefix") {
			if (!args[1]) return message.reply(`Usage: ${prefix}gset prefix <new prefix|reset>`);
			if (args[1] === "reset") { await threadsData.set(tid, null, "data.prefix"); return message.reply(`✅ Prefix reset to "${global.GoatBot.config.prefix}"`); }
			if (args[1].length > 5) return message.reply("❌ Prefix can be at most 5 characters.");
			await threadsData.set(tid, args[1], "data.prefix"); return message.reply(`✅ Prefix for this group: ${args[1]}`);
		}
		if (sub === "lang") {
			const ok = ["en", "bn", "hi", "tl", "ar", "vi"]; if (!ok.includes(args[1])) return message.reply("❌ Choose one of: " + ok.join(", "));
			await threadsData.set(tid, args[1], "data.lang"); return message.reply(`✅ Language for this group: ${args[1]}`);
		}
		if (sub === "off" || sub === "on") {
			const name = (args[1] || "").toLowerCase(), real = global.GoatBot.commands.get(name) || global.GoatBot.commands.get(global.GoatBot.aliases.get(name));
			if (!real) return message.reply("❌ No such command: " + (name || "(empty)"));
			const n = real.config.name;
			if (gs.isProtected(n)) return message.reply(`🔒 "${n}" can't be switched off.`);
			await threadsData.set(tid, gs.toggled(gs.getDisabled(td), n, sub === "off"), "data.disabledCommands");
			return message.reply(sub === "off" ? `🚫 "${n}" is now off in this group.` : `✅ "${n}" is back on.`);
		}
		return message.reply(`Unknown option. Try ${prefix}help gset`);
	}
};
