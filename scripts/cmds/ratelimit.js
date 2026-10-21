const cs = require("../../utils/configStore.js");
module.exports = {
	config: {
		name: "ratelimit", aliases: ["rl"], version: "1.0", author: "HR ID OY", countDown: 3, role: 2,
		description: "View/edit per-command rate limits (max uses per time window, per user)", category: "System",
		guide: "{p}ratelimit                    show\n{p}ratelimit on|off\n{p}ratelimit default <max> <seconds>\n{p}ratelimit <command> <max> <seconds>\n{p}ratelimit <command> remove"
	},
	onStart: async function ({ message, args }) {
		const rl = global.GoatBot.config.rateLimit = global.GoatBot.config.rateLimit || { enable: true, perCommand: {} };
		rl.perCommand = rl.perCommand || {};
		const a = args[0] && args[0].toLowerCase();
		if (!a) return message.reply(`⏱ RATE LIMIT (${rl.enable ? "ON" : "OFF"})\n• default: ${rl.default ? rl.default.maxUses + "/" + rl.default.perSeconds + "s" : "none"}\n` + (Object.entries(rl.perCommand).map(([k, v]) => `• ${k}: ${v.maxUses}/${v.perSeconds}s`).join("\n") || "• no per-command rules"));
		if (a === "on" || a === "off") { rl.enable = a === "on"; cs.saveConfig(); return message.reply(`✅ Rate limit ${a}`); }
		if (args[1] === "remove") { delete rl.perCommand[a]; cs.saveConfig(); return message.reply(`✅ Removed rule for ${a}`); }
		const max = parseInt(args[1]), sec = parseInt(args[2]);
		if (!(max > 0) || !(sec > 0)) return message.reply("❌ Usage: ratelimit <command|default> <max> <seconds>");
		if (a === "default") rl.default = { maxUses: max, perSeconds: sec };
		else rl.perCommand[a] = { maxUses: max, perSeconds: sec };
		cs.saveConfig(); return message.reply(`✅ ${a}: ${max} uses / ${sec}s`);
	}
};
