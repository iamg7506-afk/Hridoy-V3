module.exports = {
	config: { name: "torustatus", aliases: ["botstatus", "pstatus"], version: "1.0", author: "toru-pro", countDown: 5, role: 0, description: "Stylish bot health panel", category: "system", guide: "{p}torustatus" },
	onStart: async function ({ message }) {
		const G = global.GoatBot, c = G.config, u = process.uptime(), m = process.memoryUsage().rss / 1048576;
		let two = c.twoIdMode && c.twoIdMode.enable ? "primary" : "off";
		try { two = JSON.parse(require("fs").readFileSync(process.cwd() + "/data/twoIdModeState.json", "utf8")).activeAccount; } catch (_) {}
		const on = (x) => (x ? "🟢" : "⚪");
		return message.reply(`╭─── ✦ 𝗧𝗢𝗥𝗨 𝗣𝗥𝗢 ✦ ───╮\n ⏱ Uptime  ${Math.floor(u / 3600)}h ${Math.floor(u % 3600 / 60)}m\n 💾 RAM     ${m.toFixed(0)} MB\n 🗄 DB      ${c.database.type}\n 🧩 Cmds    ${G.commands.size}\n 👥 Account ${two}\n├──────────────────\n ${on(c.antiSpam && c.antiSpam.enable)} Anti-spam   ${on(c.rateLimit && c.rateLimit.enable)} Rate limit\n ${on(c.autoBackup && c.autoBackup.enable)} Backup      ${on(c.hotReload && c.hotReload.enable)} Hot-reload\n ${on(c.reminders && c.reminders.enable)} Reminders   ${on(c.bridge && (c.bridge.telegram.enable || c.bridge.discord.enable))} Bridge\n ${on(c.maintenanceMode && c.maintenanceMode.enable)} Maintenance\n╰──────────────────╯`);
	}
};
