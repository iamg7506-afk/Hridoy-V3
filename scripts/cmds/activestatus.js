const { getPrefix } = global.utils;
const accountAuto = require("../../utils/accountAuto.js");

module.exports = {
	config: {
		name: "activestatus",
		aliases: ["active", "onlinestatus"],
		version: "3.0.1",
		author: "HR ID OY",
		countDown: 3,
		role: 2,
		description: "Set your active status on/off on Facebook (persists across restarts)",
		category: "System",
		guide: {
			en: "{pn} on - Turn on active status\n{pn} off - Turn off active status\n{pn} status - Check current status"
		}
	},

	// Called once at boot (scripts/bot/login/loadScripts.js). If the saved
	// setting is ON, re-assert it against Facebook, since a fresh login
	// session can silently reset presence visibility server-side.
	// Best-effort only: never throws, never blocks other commands loading.
	onLoad: async function ({ api }) {
		try {
			// Re-asserting presence on every start is an automatic account action; it is now opt-in
			// (config.fca.reassertActiveStatusOnBoot = true). The command itself works as before.
			if (global.GoatBot?.config?.fca?.reassertActiveStatusOnBoot === true && accountAuto.getSetting("activeStatus")) {
				await new Promise((resolve) => {
					api.setActiveStatus(true, () => resolve());
				});
			}
		}
		catch (err) {
			console.error("[activestatus] Failed to restore active status on boot:", err.message || err);
		}
	},

	onStart: async function ({ message, args, api, event }) {
		const action = (args[0] || "").toLowerCase();

		if (!action) {
			const enabled = accountAuto.getSetting("activeStatus");
			return message.reply(`📱 Active Status Commands:\n\n• ${getPrefix(event.threadID)}activestatus on - Turn on active status\n• ${getPrefix(event.threadID)}activestatus off - Turn off active status\n• ${getPrefix(event.threadID)}activestatus status - Check current status\n\nCurrent: ${enabled ? "✅ ON" : "❌ OFF"}`);
		}

		try {
			switch (action) {
				case "on": {
					await new Promise((resolve, reject) => {
						api.setActiveStatus(true, (err, data) => {
							if (err) reject(err);
							else resolve(data);
						});
					});
					accountAuto.saveSetting("activeStatus", true);
					return message.reply("✅ Active status turned ON (saved — will stay on after restart)");
				}

				case "off": {
					await new Promise((resolve, reject) => {
						api.setActiveStatus(false, (err, data) => {
							if (err) reject(err);
							else resolve(data);
						});
					});
					accountAuto.saveSetting("activeStatus", false);
					return message.reply("✅ Active status turned OFF (saved — will stay off after restart)");
				}

				case "status": {
					const enabled = accountAuto.getSetting("activeStatus");
					return message.reply(`📱 Active Status Info:\n\n• Saved state: ${enabled ? "✅ ON" : "❌ OFF"}\n\n🔍 Use "on" or "off" to change your active status\n\n• ON: Friends can see when you're active\n• OFF: You appear offline to friends\n\nNote: This affects your visibility across Facebook Messenger, and is restored automatically on every bot restart.`);
				}

				default:
					return message.reply("❌ Invalid action! Use: on, off, or status");
			}
		}
		catch (error) {
			console.error("Active Status Error:", error);
			return message.reply("❌ An error occurred while setting active status. Please try again later.");
		}
	}
};