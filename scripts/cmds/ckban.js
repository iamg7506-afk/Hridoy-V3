const PAGE_SIZE = 10;

async function getBannedList(usersData) {
	const all = await usersData.getAll();
	return all.filter(u => u.banned && u.banned.status === true);
}

function formatEntry(index, userDoc) {
	const banned = userDoc.banned || {};
	return [
		`${index}. ${userDoc.name || "Unknown"}`,
		`   • UID: ${userDoc.userID}`,
		`   • Reason: ${banned.reason || "(no reason given)"}`,
		`   • Date: ${banned.date || "Unknown"}`,
		`   • Banned by: ${banned.bannedByName || banned.bannedBy || "Unknown"}`
	].join("\n");
}

function buildPageText(bannedList, page, totalPages) {
	const start = (page - 1) * PAGE_SIZE;
	const pageItems = bannedList.slice(start, start + PAGE_SIZE);
	const lines = pageItems.map((u, i) => formatEntry(start + i + 1, u));

	return [
		`🚫 Banned Users — page ${page}/${totalPages} (${bannedList.length} total)`,
		"━━━━━━━━━━━━━━━━━",
		lines.join("\n\n") || "(none on this page)",
		"━━━━━━━━━━━━━━━━━",
		"➡️ Reply with a number to unban that user (e.g. \"1\")",
		totalPages > 1 ? `➡️ For another page, run this command again with a page number, e.g. page ${Math.min(page + 1, totalPages)}` : ""
	].filter(Boolean).join("\n");
}

module.exports = {
	config: {
		name: "ckban",
		aliases: ["banlist", "bannedlist"],
		version: "2.1.2",
		author: "HR ID OY",
		countDown: 3,
		role: 2, // bot owner/admin only
		description: "List every banned user, with reply-based unban",
		category: "Admin",
		guide: {
			en: "{pn} [page]\n\nAfter the list is shown, reply with a number to unban that user."
		}
	},

	// Reuses GoatBot's own reply system (global.GoatBot.onReply, an
	// ExpiringMap — the same mechanism setting.js/unfriend.js already
	// use) instead of a custom reply handler. No new listener created.
	onStart: async function ({ message, args, event, usersData }) {
		const bannedList = await getBannedList(usersData);

		if (bannedList.length === 0) {
			return message.reply("✅ There are currently no banned users.");
		}

		const totalPages = Math.max(1, Math.ceil(bannedList.length / PAGE_SIZE));
		let page = parseInt(args[0]) || 1;
		if (page < 1) page = 1;
		if (page > totalPages) page = totalPages;

		const text = buildPageText(bannedList, page, totalPages);
		const sent = await message.reply(text);

		global.GoatBot.onReply.set(sent.messageID, {
			commandName: "ckban",
			messageID: sent.messageID,
			author: event.senderID,
			// Fixed snapshot of UIDs in serial order at the moment this list
			// was posted — replies always resolve against this snapshot, so
			// "3" keeps meaning the same person even after "1" and "2" have
			// already been unbanned from the same posted list.
			snapshot: bannedList.map(u => u.userID)
		});
	},

	onReply: async function ({ event, Reply, message, usersData }) {
		const { author, snapshot } = Reply;
		if (event.senderID !== author) return; // only the person who ran ckban can act on it

		const index = parseInt((event.body || "").trim()) - 1;
		if (isNaN(index) || index < 0 || index >= snapshot.length) {
			return message.reply(`❌ Please reply with a valid number between 1 and ${snapshot.length}.`);
		}

		const targetUID = snapshot[index];
		const targetData = await usersData.get(targetUID);

		if (!targetData.banned || targetData.banned.status !== true) {
			return message.reply(`⚠️ ${targetData.name || targetUID} is already not banned (unbanned earlier).`);
		}

		await usersData.set(targetUID, { banned: {} });

		return message.reply(
			`✅ Unbanned ${targetData.name || targetUID} (UID: ${targetUID}).\n` +
			`Reply with another number from this list to unban someone else, or run the command again to see the current list.`
		);
	}
};
