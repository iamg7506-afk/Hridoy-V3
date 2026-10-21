const { getTime } = global.utils;

// Resolves target UID from: reply > @mention > raw uid argument.
// Returns leftover args (used as the ban reason).
function resolveTarget(event, args) {
	if (event.messageReply && event.messageReply.senderID) {
		return { targetUID: String(event.messageReply.senderID), remainingArgs: args.slice() };
	}
	if (event.mentions && Object.keys(event.mentions).length > 0) {
		const targetUID = Object.keys(event.mentions)[0];
		const mentionText = event.mentions[targetUID] || "";
		const remainingText = args.join(" ").replace(mentionText, "").trim();
		return { targetUID, remainingArgs: remainingText ? remainingText.split(/ +/) : [] };
	}
	if (args[0] && /^\d+$/.test(args[0])) {
		return { targetUID: args[0], remainingArgs: args.slice(1) };
	}
	return { targetUID: null, remainingArgs: args.slice() };
}

module.exports = {
	config: {
		name: "ban",
		version: "2.1.2",
		author: "HR ID OY",
		countDown: 3,
		role: 2, // bot owner/admin only
		description: "Ban a user from using the bot — enforced globally, across every thread",
		category: "Admin",
		guide: {
			en:
				"{pn} (reply to their message) <reason>\n" +
				"{pn} @mention <reason>\n" +
				"{pn} <uid> <reason>"
		}
	},

	// ENFORCEMENT NOTE: this command only writes to the `banned` field on
	// the user's existing GoatBot database record (usersData.set). The
	// actual blocking of that user's commands, replies, and reactions —
	// in every thread — is already handled by GoatBot's own core
	// (bot/handler/handlerEvents.js -> isBannedOrOnlyAdmin(), called
	// before every command/onReply/onReaction dispatch), so a banned
	// user simply gets no response at all, anywhere, without any extra
	// code here. No new listener or separate ban system is created.
	onStart: async function ({ message, args, event, usersData, prefix }) {
		const { targetUID, remainingArgs } = resolveTarget(event, args);
		const reason = remainingArgs.join(" ").trim().replace(/\s+/g, " ");

		if (!targetUID) {
			return message.reply(
				"❌ Please specify who to ban.\n\nUsage:\n" +
				`${prefix}ban (reply to their message) <reason>\n` +
				`${prefix}ban @mention <reason>\n` +
				`${prefix}ban <uid> <reason>`
			);
		}
		if (String(targetUID) === String(event.senderID)) {
			return message.reply("❌ You can't ban yourself.");
		}
		if ((global.GoatBot.config.adminBot || []).includes(String(targetUID))) {
			return message.reply("❌ This user is a bot admin and can't be banned.");
		}
		if (!reason) {
			return message.reply(`❌ Please provide a ban reason.\n\nUsage: ${prefix}ban <uid> <reason>`);
		}

		const targetData = await usersData.get(targetUID);

		if (targetData.banned && targetData.banned.status === true) {
			return message.reply(
				`⚠️ ${targetData.name || targetUID} is already banned.\n` +
				`• Reason: ${targetData.banned.reason || "(none)"}\n` +
				`• Date: ${targetData.banned.date || "Unknown"}\n` +
				`• Banned by: ${targetData.banned.bannedByName || targetData.banned.bannedBy || "Unknown"}`
			);
		}

		const adminName = await usersData.getName(event.senderID).catch(() => event.senderID);
		const date = getTime("DD/MM/YYYY HH:mm:ss");

		await usersData.set(targetUID, {
			banned: {
				status: true,
				reason,
				date,
				bannedBy: event.senderID,
				bannedByName: adminName
			}
		});

		return message.reply(
			`✅ Banned ${targetData.name || targetUID} (UID: ${targetUID}).\n` +
			`• Reason: ${reason}\n` +
			`• Date: ${date}\n` +
			`• Banned by: ${adminName}\n\n` +
			`This user can no longer use any bot command, and their messages/replies/reactions are ignored, in every thread.`
		);
	}
};
