const R = require("../../utils/reminderService.js");
const fmt = (ms, tz) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
module.exports = {
	config: {
		name: "remind", aliases: ["reminder", "rmd"], version: "1.0", author: "HR ID OY", countDown: 3, role: 0,
		description: "Reminders in Banglish/English: 'kal 9tay remind koro ...'", category: "Utility",
		guide: "{p}remind kal 9tay assignment dite hobe\n{p}remind 10 minute pore chai khabo\n{p}remind 25/12 8:30pm birthday wish\n{p}remind protidin 8am water kheyo\n{p}remind list | del <number> | clear"
	},
	onLoad: function ({ api, usersData }) { R.start({ api, usersData }); },
	onStart: async function ({ message, event, args, usersData }) {
		const tz = global.GoatBot.config.timeZone || "Asia/Dhaka", cfg = global.GoatBot.config.reminders || {};
		if (cfg.enable === false) return message.reply("⏰ Reminders are disabled in config.");
		const sub = (args[0] || "").toLowerCase(), uid = event.senderID;
		if (sub === "list") {
			const l = R.listFor(uid, event.threadID);
			return message.reply(l.length ? "⏰ YOUR REMINDERS\n━━━━━━━━━━━━\n" + l.map((r, i) => `${i + 1}. ${fmt(r.at, tz)}${r.repeat ? " 🔁" + r.repeat : ""}\n   ${r.text}`).join("\n") : "📭 No reminders here.");
		}
		if (sub === "clear") return message.reply(`🗑 Removed ${R.clearFor(uid, event.threadID)} reminder(s).`);
		if (sub === "del" || sub === "delete" || sub === "remove") {
			const r = R.listFor(uid, event.threadID)[parseInt(args[1]) - 1];
			return message.reply(r && R.remove(r.id) ? "🗑 Deleted." : "❌ Wrong number. See: remind list");
		}
		if (!args.length) return message.reply("⏰ Example:\nremind kal 9tay assignment dite hobe\nremind 10 minute pore chai khabo");
		if (R.countFor(uid) >= (cfg.maxPerUser || 20)) return message.reply("❌ Reminder limit reached. Delete some first.");
		const p = R.parseReminder(args.join(" "), new Date(), tz);
		if (!p.ok) return message.reply({ no_time: "❌ Time bujhte parini. Example: kal 9tay ... / 10 minute pore ...", past: "❌ Ei somoy ta ekhon-i ato gese.", too_far: "❌ Maximum 1 year age porjonto.", bad_time: "❌ Time ta thik na.", empty: "❌ Kisu likho." }[p.error] || "❌ Parse hoyni.");
		const name = await usersData.getName(uid).catch(() => "");
		const it = R.add({ userID: uid, threadID: event.threadID, at: p.at, text: p.text, repeat: p.repeat, name });
		return message.reply(`✅ Reminder set!\n🕒 ${fmt(it.at, tz)}${p.repeat ? " (🔁 " + p.repeat + ")" : ""}\n📝 ${it.text}`);
	}
};
