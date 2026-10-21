const accountAuto = require("../../utils/accountAuto.js");

module.exports = {
	config: {
		name: "autoread",
		aliases: ["autoreadthread"],
		version: "1.0.1",
		author: "HR ID OY",
		countDown: 0,
		// Toggling is owner/admin-only; the passive listener must still
		// react to every incoming message regardless of sender.
		role: { onStart: 2, onChat: 0 },
		shortDescription: "Auto mark current thread as read",
		longDescription: "When enabled, automatically marks the thread a new message arrives in as read (per-thread), separate from autoseen which marks the whole inbox as seen.",
		category: "System",
		guide: {
			en: "{pn} on/off - Toggle auto-read\n{pn} status - Check current status"
		}
	},

	onStart: async function ({ message, args }) {
		const action = (args[0] || "").toLowerCase();
		const enabled = accountAuto.getSetting("autoRead");

		if (!action || action === "status") {
			return message.reply(`📖 Auto Read is currently ${enabled ? "✅ ON" : "❌ OFF"}.\n\nUse: {pn} on/off`);
		}

		if (action === "on") {
			accountAuto.saveSetting("autoRead", true);
			return message.reply("✅ Auto Read turned ON (saved — will stay on after restart)");
		}
		else if (action === "off") {
			accountAuto.saveSetting("autoRead", false);
			return message.reply("❌ Auto Read turned OFF");
		}
		else {
			return message.reply("⚠️ Usage: {pn} on/off/status");
		}
	},

	// Runs on every incoming message via GoatBot's single central
	// dispatcher (bot/handler/handlerAction.js -> onChat()). No new
	// listener is registered — this only reacts to the existing one.
	onChat: async function ({ event, api }) {
		try {
			if (event.type !== "message") return;
			if (!accountAuto.getSetting("autoRead")) return;

			const threadID = event.threadID;
			if (!threadID) return;

			// Per-thread cooldown to avoid one markAsRead call per message
			// during a burst of activity in the same thread.
			global.__autoReadCooldown = global.__autoReadCooldown || {};
			const now = Date.now();
			if (now - (global.__autoReadCooldown[threadID] || 0) < 2000) return;
			global.__autoReadCooldown[threadID] = now;

			await api.markAsRead(threadID, true);
		}
		catch (err) {
			console.error("[autoread] markAsRead failed:", err && (err.message || err.error || err));
		}
	}
};
