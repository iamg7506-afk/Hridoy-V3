const B = require("../../utils/autoBackup.js");
module.exports = {
	config: { name: "abackup", aliases: ["autobackup"], version: "1.0", author: "toru-pro", countDown: 10, role: 2, description: "Run / check the automatic backup (local, Mongo, Telegram, Drive)", category: "owner", guide: "{p}abackup now | status" },
	onStart: async function ({ message, args }) {
		if ((args[0] || "status") === "now") { await message.reply("🗄 Backup shuru..."); const r = await B.run("command"); return message.reply(`${r.ok ? "✅" : "❌"} ${r.file}\n${r.info}`); }
		const s = B.status(), c = global.GoatBot.config.autoBackup || {};
		return message.reply(`🗄 AUTO BACKUP: ${c.enable ? "ON" : "OFF"}\n⏱ cron: ${c.cron}\n📌 last: ${s.at ? new Date(s.at).toLocaleString() + (s.ok ? " ✅" : " ❌") + "\n" + s.info : "none yet"}`);
	}
};
