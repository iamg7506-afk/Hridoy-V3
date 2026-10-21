async function checkShortCut(nickname, uid, usersData) {
	try {
		if (/\{userName\}/gi.test(nickname))
			nickname = nickname.replace(/\{userName\}/gi, await usersData.getName(uid));

		if (/\{userID\}/gi.test(nickname))
			nickname = nickname.replace(/\{userID\}/gi, uid);

		return nickname;
	} catch (e) {
		return nickname;
	}
}

module.exports = {
	config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
		name: "setname",
		version: "2.2",
		author: "HR ID OY",
		countDown: 5,
		role: 0,
		shortDescription: "Change nickname",
		category: "Group"
	},

	onStart: async function ({ args, message, event, api, usersData }) {
		let uids = [];
		let nickname = args.join(" ");

		// ✅ Reply system
		if (event.messageReply) {
			uids = [event.messageReply.senderID];
			nickname = nickname.trim();
		}

		// ✅ Mention system
		else if (Object.keys(event.mentions).length) {
			const mentions = Object.keys(event.mentions);
			uids = mentions;

			const allName = new RegExp(
				Object.values(event.mentions)
					.map(name => name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
					.join("|"),
				"g"
			);

			// Remove mention names + @ symbol
			nickname = nickname.replace(allName, "").replace(/@/g, "").trim();
		}

		// ✅ Change all members
		else if (args[0] === "all") {
			const threadInfo = await api.getThreadInfo(event.threadID);
			uids = threadInfo.participantIDs;
			nickname = args.slice(1).join(" ").trim();
		}

		// ✅ Self nickname
		else {
			uids = [event.senderID];
			nickname = nickname.trim();
		}

		try {
			for (const uid of uids) {
				await api.changeNickname(
					await checkShortCut(nickname, uid, usersData),
					event.threadID,
					uid
				);
			}

			message.reply(`✅ Nickname updated successfully`);
		} catch (e) {
			message.reply(`❌ Failed to change nickname`);
		}
	}
};
