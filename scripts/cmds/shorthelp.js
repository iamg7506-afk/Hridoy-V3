module.exports = {
	config: {
		name: "shorthelp",
		version: "1.2",
		author: "HR ID OY",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem danh sách help theo thể loại hoặc chi tiết lệnh",
			en: "View help list by category or command details"
		},
		category: "System",
		guide: {
			en: "{pn} → show category list (reply with a number to see that category's commands)\n"
				+ "{pn} <category name> → show all commands in that category\n"
				+ "{pn} <command name> → show that command's details"
		}
	},

	langs: {
		vi: {
			categoryNotFound: "❌ Không tìm thấy thể loại hoặc lệnh có tên \"%1\"",
			invalidNumber: "❌ Vui lòng trả lời bằng một số hợp lệ trong danh sách"
		},
		en: {
			categoryNotFound: "❌ No category or command found with the name \"%1\"",
			invalidNumber: "❌ Please reply with a valid number from the list"
		}
	},

	onStart: async function ({ message, args, event, api, getLang }) {
		const commandsMap = global.GoatBot.commands;
		const aliasesMap = global.GoatBot.aliases;

		// Group commands by category
		const categories = {};
		for (const [name, cmd] of commandsMap) {
			const cat = cmd.config.category || "Others";
			if (!categories[cat]) categories[cat] = [];
			categories[cat].push(name);
		}
		for (const cat in categories) categories[cat].sort();

		const categoryNames = Object.keys(categories).sort();

		// ===== NO ARGS: numbered category list =====
		if (!args[0]) {
			let msg = `📂 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬 𝗟𝗜𝗦𝗧\n\n`;
			categoryNames.forEach((cat, i) => {
				msg += `${i + 1}. ${cat} (${categories[cat].length})\n`;
			});
			msg += `\n💬 Reply with a number to see that category's commands.`;

			return message.reply(msg, (err, info) => {
				if (err) return;
				global.GoatBot.onReply.set(info.messageID, {
					commandName: this.config.name,
					type: "categoryList",
					categoryNames,
					categories,
					author: event.senderID
				});
				autoUnsend(api, info.messageID);
			});
		}

		const query = args.join(" ");
		const queryLower = query.toLowerCase();

		// ===== ARG MATCHES A CATEGORY =====
		const matchedCategory = categoryNames.find(cat => cat.toLowerCase() === queryLower);
		if (matchedCategory) {
			return sendCategoryCommands(message, api, matchedCategory, categories[matchedCategory]);
		}

		// ===== ARG MATCHES A COMMAND NAME OR ALIAS =====
		const cmd = commandsMap.get(queryLower) || commandsMap.get(aliasesMap.get(queryLower));
		if (cmd) {
			return sendCommandDetails(message, api, cmd);
		}

		// ===== NOTHING MATCHED =====
		const msg = await message.reply(getLang("categoryNotFound", query));
		autoUnsend(api, msg?.messageID);
	},

	onReply: async function ({ api, event, message, Reply, getLang }) {
		const { body, senderID } = event;

		// Only the person who ran the command can use the reply
		if (Reply.author && senderID !== Reply.author) return;

		if (Reply.type !== "categoryList") return;

		const num = parseInt(body.trim());
		if (isNaN(num) || num < 1 || num > Reply.categoryNames.length) {
			const msg = await message.reply(getLang("invalidNumber"));
			return autoUnsend(api, msg?.messageID);
		}

		const catName = Reply.categoryNames[num - 1];
		return sendCategoryCommands(message, api, catName, Reply.categories[catName]);
	}
};

// ===== HELPERS =====

function autoUnsend(api, messageID, delayMs = 60000) {
	if (!messageID || !api?.unsendMessage) return;
	setTimeout(() => {
		api.unsendMessage(messageID).catch(() => {});
	}, delayMs);
}

async function sendCategoryCommands(message, api, categoryName, commandNames) {
	let msg = `🗂️ 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬: ${categoryName.toUpperCase()} (${commandNames.length})\n\n`;
	msg += commandNames.map(name => `✧ ${name}`).join("\n");

	const sent = await message.reply(msg);
	autoUnsend(api, sent?.messageID);
	return sent;
}

async function sendCommandDetails(message, api, cmd) {
	const c = cmd.config;
	const desc = typeof c.shortDescription === "object"
		? (c.shortDescription.en || Object.values(c.shortDescription)[0] || "N/A")
		: (c.shortDescription || c.longDescription || (c.description && (c.description.en || Object.values(c.description)[0])) || "N/A");
	const guide = typeof c.guide === "object"
		? (c.guide.en || Object.values(c.guide)[0] || "")
		: (c.guide || "");

	const msg =
		`╭━━━〔 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 〕━━━⬣\n` +
		`┃ 📌 Name        : ${c.name}\n` +
		`┃ 🗂️ Category    : ${c.category || "Others"}\n` +
		`┃ 📝 Description : ${desc}\n` +
		`┃ 🔖 Aliases     : ${c.aliases ? c.aliases.join(", ") : "None"}\n` +
		(guide ? `┃ 💡 Guide       : ${guide}\n` : "") +
		`╰━━━━━━━━━━━━━━━━━━━━⬣`;

	const sent = await message.reply(msg);
	autoUnsend(api, sent?.messageID);
	return sent;
}
