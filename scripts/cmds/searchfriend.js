module.exports = {
	config: {
		name: "searchfriend",
		aliases: ["fsearch", "friendsearch"],
		version: "3.0.1",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		description: "Search your Facebook friends list by name with full details",
		category: "Utility",
		guide: {
			en: "{pn} <name>"
		}
	},

	onStart: async function ({ message, args, api }) {
		const query = args.join(" ").trim();

		if (!query) {
			return message.reply("❌ Please provide a name to search.\n\nUsage: {pn} <name>");
		}

		try {
			const list = await new Promise((resolve, reject) => {
				api.getFriendsList((err, data) => {
					if (err) reject(err);
					else resolve(data);
				});
			});

			if (!Array.isArray(list) || list.length === 0) {
				return message.reply("❌ Bot account-er kono friend paoa jayni.");
			}

			// Query o friend name - duitai lowercase kore normalize kore
			// substring match kora hocche, exact match lagbe na
			const q = query.toLowerCase();
			const results = list.filter(friend =>
				friend.fullName && friend.fullName.toLowerCase().includes(q)
			);

			if (results.length === 0) {
				return message.reply(`❌ No friends found matching "${query}".`);
			}

			const top = results.slice(0, 10);

			const genderMap = {
				MALE: "Male ♂️",
				FEMALE: "Female ♀️",
				NEUTER: "Not specified",
				UNKNOWN: "Not specified"
			};

			const blocks = top.map((friend, i) => {
				const name = friend.fullName || "N/A";
				const firstName = friend.firstName || "N/A";
				const altName = friend.alternateName || "None";
				const gender = genderMap[friend.gender] || "Not specified";
				const vanity = friend.vanity || "None";
				const profileUrl = friend.profileUrl || `https://www.facebook.com/${friend.userID}`;

				return (
					`━━━━━━━━━━━━━━━━━━\n` +
					`${i + 1}. 👤 ${name}\n` +
					`━━━━━━━━━━━━━━━━━━\n` +
					`🆔 UID: ${friend.userID}\n` +
					`📛 First name: ${firstName}\n` +
					`🏷️ Nickname/alternate name: ${altName}\n` +
					`⚧ Gender: ${gender}\n` +
					`🔗 Profile: ${profileUrl}\n` +
					`🌐 Username/vanity: ${vanity}`
				);
			});

			return message.reply(
				`🔎 ADVANCED FRIEND SEARCH\n` +
				`Query: "${query}"  |  Matched: ${results.length}  |  Showing: ${top.length}\n\n` +
				blocks.join("\n\n")
			);
		}
		catch (err) {
			console.error("[searchfriend] Failed:", err);
			return message.reply(`❌ Search failed: ${(err && (err.error || err.message)) || JSON.stringify(err)}`);
		}
	}
};