module.exports = {
	config: {
		shortDescription: "Tag (Utility)", // auto-added: was missing, caused blank entry in help
		name: "tag",
		version: "2.1",
		author: "HR ID OY",
		countDown: 0,
		role: 0,
		category: "Utility",
		guide: {
			en: "{pn} [reply/@mention/name/all] [text]"
		}
	},

	langs: {
		en: {
			no_user: "❌ User not found in this group!",
			guide_msg: "⚠️ Please reply, mention, type a name or use 'all'!",
			error: "❌ Error occurred: %1"
		}
	},

	onStart: async function ({ api, event, args, getLang }) {
		try {
			const { threadID, messageID, messageReply, mentions } = event;

			if (!args.length) {
				return api.sendMessage(
					getLang("guide_msg"),
					threadID,
					messageID
				);
			}

			// TAG ALL
			if (
				["all", "everyone", "tagall"].includes(
					args[0].toLowerCase()
				)
			) {
				const threadInfo = await api.getThreadInfo(threadID);

				const mentionData = [];
				let body = args.slice(1).join(" ") || "📢 Everyone";

				threadInfo.userInfo.forEach((user) => {
					body += `\n@${user.name}`;
					mentionData.push({
						tag: `@${user.name}`,
						id: user.id
					});
				});

				return api.sendMessage(
					{
						body,
						mentions: mentionData
					},
					threadID,
					messageID
				);
			}

			let uid;
			let text = args.join(" ");

			// Reply
			if (messageReply) {
				uid = messageReply.senderID;
			}

			// Mention
			else if (Object.keys(mentions).length > 0) {
				uid = Object.keys(mentions)[0];
				text = text.replace(/@\S+/g, "").trim();
			}

			// Name Search
			else {
				const nameInput = args[0].toLowerCase();

				const threadInfo = await api.getThreadInfo(threadID);

				const member = threadInfo.userInfo.find(
					(u) =>
						u.name &&
						u.name.toLowerCase().includes(nameInput)
				);

				if (!member)
					return api.sendMessage(
						getLang("no_user"),
						threadID,
						messageID
					);

				uid = member.id;
				text = args.slice(1).join(" ");
			}

			const userInfo = await api.getUserInfo(uid);
			const name = userInfo[uid]?.name || "User";

			return api.sendMessage(
				{
					body: `${name} ${text}`.trim(),
					mentions: [
						{
							tag: name,
							id: uid
						}
					]
				},
				threadID,
				messageID
			);
		} catch (e) {
			console.error(e);
			return api.sendMessage(
				getLang("error", e.message),
				event.threadID,
				event.messageID
			);
		}
	}
};