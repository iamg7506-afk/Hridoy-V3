const money = require("../../utils/money");

module.exports = {
	config: {
		name: "transfer",
		aliases: ["pay", "send", "give"],
		version: "1.1",
		author: "HR ID OY",
		countDown: 5,
		role: 0,
		shortDescription: {
			en: "Transfer your balance"
		},
		longDescription: {
			en: "Transfer your balance to another user"
		},
		category: "Game",
		guide: {
			en: "{pn} <amount> @mention\n{pn} <amount> (reply)\n{pn} <uid> <amount>"
		}
	},

	onStart: async function ({ api, event, args }) {
		const { threadID, messageID, senderID, mentions, messageReply } = event;

		let targetID;
		let amount;

		// Reply
		if (messageReply) {
			targetID = messageReply.senderID;
			amount = parseInt(args[0]);
		}

		// Mention
		else if (Object.keys(mentions).length > 0) {
			targetID = Object.keys(mentions)[0];
			amount = parseInt(args[0]);
		}

		// UID
		else if (args.length >= 2) {
			targetID = args[0];
			amount = parseInt(args[1]);
		}

		else {
			return api.sendMessage(
				"💸 | Usage:\n\n• .transfer <amount> @mention\n• Reply: .transfer <amount>\n• .transfer <uid> <amount>",
				threadID,
				messageID
			);
		}

		if (targetID == senderID)
			return api.sendMessage(
				"❌ | You can't transfer money to yourself.",
				threadID,
				messageID
			);

		if (isNaN(amount) || amount <= 0)
			return api.sendMessage(
				"❌ | Please enter a valid amount.",
				threadID,
				messageID
			);

		const senderBalance = await money.get(senderID);

		if (senderBalance < amount)
			return api.sendMessage(
				`❌ | You don't have enough balance.\n\n💰 Balance: ${senderBalance}$`,
				threadID,
				messageID
			);

		// Transfer
		await money.subtract(senderID, amount);
		await money.add(targetID, amount);

		let senderName = "Unknown";
		let receiverName = "Unknown";

		try {
			const info = await api.getUserInfo([senderID, targetID]);
			senderName = info[senderID]?.name || "Unknown";
			receiverName = info[targetID]?.name || "Unknown";
		}
		catch (e) {}

		api.sendMessage(
`💸 𝗕𝗔𝗟𝗔𝗡𝗖𝗘 𝗧𝗥𝗔𝗡𝗦𝗙𝗘𝗥

👤 From: ${senderName}
🎯 To: ${receiverName}

💵 Amount: ${amount}$

━━━━━━━━━━━━━━
💰 Your Balance: ${await money.get(senderID)}$
💳 Receiver Balance: ${await money.get(targetID)}$

✅ Transfer Successful!`,
			threadID,
			messageID
		);
	}
};
