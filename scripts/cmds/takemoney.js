const money = require("../../utils/money");

// 🔐 ONLY THIS UID CAN USE THE COMMAND
const SPECIAL_UIDS = ["100067155687291", "61595715143202"];

module.exports = {
  config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
    name: "takemoney",
    aliases: ["tm"],
    version: "3.1.1",
    author: "HR ID OY",
    role: 0,
    description: "Special UID only - Remove money",
    category: "Admin",
    countDown: 3
  },

  onStart: async function ({ message, event, args }) {
    try {
      // =========================
      // 🔐 SPECIAL UID CHECK
      // =========================
      if (!SPECIAL_UIDS.includes(String(event.senderID))) {
        return message.reply(
          "🚫 এই command ব্যবহার করার permission তোমার নেই।"
        );
      }

      const { mentions, senderID } = event;

      if (!args[0] || !args[1]) {
        return message.reply(
          "⚠️ Usage:\n\n" +
          ".takemoney @user 5000\n" +
          ".takemoney me 5000"
        );
      }

      const amount = Number(args[args.length - 1]);

      if (!Number.isSafeInteger(amount) || amount <= 0) {
        return message.reply(
          "❌ Amount অবশ্যই valid positive number হতে হবে।"
        );
      }

      let targetIDs = [];

      // Remove from yourself
      if (args[0].toLowerCase() === "me") {
        targetIDs = [senderID];
      }

      // Remove from mentioned user(s)
      else if (mentions && Object.keys(mentions).length > 0) {
        targetIDs = Object.keys(mentions);
      }

      else {
        return message.reply(
          "⚠️ একজন user-কে mention করো অথবা `me` ব্যবহার করো।"
        );
      }

      let result = "";

      for (const uid of targetIDs) {
        const current = Number(await money.get(uid)) || 0;

        // Not enough balance
        if (current < amount) {
          const name =
            uid === senderID
              ? "You"
              : (mentions?.[uid] || "User").replace(/^@/, "");

          return message.reply(
            `❌ ${name} এর কাছে যথেষ্ট টাকা নেই!\n\n` +
            `🏦 বর্তমান ব্যালেন্স: ${current.toLocaleString()}$`
          );
        }

        await money.subtract(uid, amount);

        const newBalance = current - amount;

        const name =
          uid === senderID
            ? "You"
            : (mentions?.[uid] || "User").replace(/^@/, "");

        result +=
          `💸 ${name} থেকে ${amount.toLocaleString()}$ কেটে নেওয়া হয়েছে\n` +
          `🏦 নতুন ব্যালেন্স: ${newBalance.toLocaleString()}$\n\n`;
      }

      return message.reply(
        "💸 Special Admin Money Update\n\n" + result
      );

    } catch (error) {
      console.error("[TAKEMONEY ERROR]", error);

      return message.reply(
        "❌ Money update করতে সমস্যা হয়েছে।"
      );
    }
  }
};
