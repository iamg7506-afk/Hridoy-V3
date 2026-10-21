const fs = require("fs-extra");
const execSync = require("child_process").execSync;
const dirBootLogTemp = `${__dirname}/tmp/rebootUpdated.txt`;

module.exports = {
	config: {
		name: "update",
		version: "1.8",
		author: "HR ID OY",
		role: 2,
		description: {
			en: "Check for and install updates for the chatbot.",
		},
		category: "System",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		en: {
			noUpdates: "✅ | You are already using the latest version of ✦ 𝙏𝙊𝙍𝙐 𝘾𝙃𝘼𝙉 ✦ (v%1).\n\n💖 | Thank you for using ✦ 𝙏𝙊𝙍𝙐 𝘾𝙃𝘼𝙉 ✦",
			updatePrompt: "💫 | You are using version %1. A new version %2 is available!\n\n⬆️ | The following files will be updated:\n%3%4\n\n📩 | For update assistance, contact the admin: HR ID OY\n💡 | React to this message to confirm the update.",
			fileWillDelete: "\n🗑️ | The following files/folders will be deleted:\n%1",
			andMore: " ...and %1 more files",
			updateConfirmed: "🚀 | Confirmed! Updating ✦ 𝙏𝙊𝙍𝙐 𝘾𝙃𝘼𝙉 ✦, please wait...",
			updateComplete: "✅ | ✦ 𝙏𝙊𝙍𝙐 𝘾𝙃𝘼𝙉 ✦ has been updated successfully!\n\n🔄 | Do you want to restart the bot now?\n💡 | Reply with \"yes\" or \"y\" to confirm.",
			updateTooFast: "⭕ | The latest update was released only %1 minutes %2 seconds ago.\n\n⏳ | Please wait %3 minutes %4 seconds before updating to avoid errors.\n\n📩 | Need help? Contact admin: HR ID OY",
			botWillRestart: "🔄 | ✦ 𝙏𝙊𝙍𝙐 𝘾𝙃𝘼𝙉 ✦ is restarting now! Please wait... 💖"
		}
	},

	onLoad: async function ({ api }) {
		if (fs.existsSync(dirBootLogTemp)) {
			const threadID = fs.readFileSync(dirBootLogTemp, "utf-8");
			fs.removeSync(dirBootLogTemp);
			api.sendMessage("✦ 𝙏𝙊𝙍𝙐 𝘾𝙃𝘼𝙉 ✦ has been restarted successfully! 💖", threadID);
		}
	},

	onStart: async function ({ message, getLang, commandName, event }) {
		const currentVersion = require("../../package.json").version;
		return message.reply(getLang("noUpdates", currentVersion));
	},

	onReaction: async function ({ message, getLang, Reaction, event }) {
		if (event.userID != Reaction.authorID) return;

		await message.reply(getLang("updateConfirmed"));
		execSync("node update", { stdio: "inherit" });
		fs.writeFileSync(dirBootLogTemp, event.threadID);

		message.reply(getLang("updateComplete"), (err, info) => {
			if (err) return console.error(err);

			global.GoatBot.onReply.set(info.messageID, {
				messageID: info.messageID,
				threadID: info.threadID,
				authorID: event.senderID
			});
		});
	},

	onReply: async function ({ message, getLang, event }) {
		if (['yes', 'y'].includes(event.body?.toLowerCase())) {
			await message.reply(getLang("botWillRestart"));
			process.exit(2);
		}
	}
};
