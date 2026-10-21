
const axios = require("axios");
const money = require("../../utils/money"); // path ঠিক করো GoatBot structure অনুযায়ী

module.exports = {
  config: {
		shortDescription: "Quiz (Game)", // auto-added: was missing, caused blank entry in help
    name: "quiz",
    aliases: ["qz"],
    version: "1.3",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    category: "Game",
    guide: { en: "{pn} — Answer quiz questions and earn rewards!" }
  },

  onStart: async function ({ api, event }) {
    try {
      const GITHUB_RAW = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
      const rawRes = await axios.get(GITHUB_RAW);
      const quizApiBase = rawRes.data.apiv1;

      const { data } = await axios.get(`${quizApiBase}/api/quiz`);
      const { question, options, answer } = data;

      const body = `╭──❖   𝐐𝐔𝐈𝐙  𝐆𝐀𝐌𝐄   ❖──╮

📜 প্রশ্ন: ${question}

🅐 ${options.a}
🅑 ${options.b}
🅒 ${options.c}
🅓 ${options.d}

────────────────
💡 ৩ বার চেষ্টা করতে পারবে!
(Reply দাও A, B, C বা D)
╰───────────────╯`;

      api.sendMessage(
        { body },
        event.threadID,
        async (err, info) => {
          if (err) return console.error(err);

          global.GoatBot.onReply.set(info.messageID, {
            commandName: "quiz",
            messageID: info.messageID,
            author: event.senderID,
            correctAnswer: answer.trim(),
            chances: 3,
            options
          });

          // auto remove after 60 sec
          setTimeout(async () => {
            if (global.GoatBot.onReply.has(info.messageID)) {
              try { await api.unsendMessage(info.messageID); } catch {}
              global.GoatBot.onReply.delete(info.messageID);
            }
          }, 60000);
        },
        event.messageID
      );
    } catch (err) {
      console.error(err);
      api.sendMessage("❌ কুইজ ডাটা আনতে সমস্যা হয়েছে!", event.threadID, event.messageID);
    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    let { author, correctAnswer, messageID, chances, options } = Reply;
    const reply = event.body?.trim().toUpperCase();

    if (event.senderID !== author)
      return api.sendMessage("⚠️ এটা তোমার কুইজ না!", event.threadID, event.messageID);

    if (!reply || !["A", "B", "C", "D"].includes(reply))
      return api.sendMessage("❌ Reply দাও শুধু A, B, C বা D দিয়ে!", event.threadID, event.messageID);

    const selectedText =
      reply === "A" ? options.a :
      reply === "B" ? options.b :
      reply === "C" ? options.c :
      reply === "D" ? options.d : "";

    if (selectedText.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
      try { await api.unsendMessage(messageID); } catch {}

      const rewardCoin = 300;
      const rewardExp = 100;

      // ✅ Correct coins via money.js
      await money.add(event.senderID, rewardCoin);

      // ✅ Add exp
      const userData = await usersData.get(event.senderID);
      await usersData.set(event.senderID, {
        money: userData.money, // money already added via money.js
        exp: userData.exp + rewardExp,
        data: userData.data
      });

      const correctMsg = `╭──✅  𝐐𝐔𝐈𝐙 𝐑𝐄𝐒𝐔𝐋𝐓  ✅──╮
│ অবস্থা     : সঠিক উত্তর!
│ উত্তর       : ${correctAnswer}
│ পুরস্কার   : +${rewardCoin} Coin
│ অভিজ্ঞতা   : +${rewardExp} EXP
│ 🏆 তুমি দুর্দান্ত করেছো!
╰───────────────╯`;

      global.GoatBot.onReply.delete(messageID);
      return api.sendMessage(correctMsg, event.threadID, event.messageID);
    } else {
      chances--;

      if (chances > 0) {
        global.GoatBot.onReply.set(messageID, { ...Reply, chances });
        return api.sendMessage(
          `❌ ভুল উত্তর!\n🔁 তোমার হাতে আছে ${chances} বার সুযোগ! আবার চেষ্টা করো!`,
          event.threadID,
          event.messageID
        );
      } else {
        try { await api.unsendMessage(messageID); } catch {}
        global.GoatBot.onReply.delete(messageID);
        return api.sendMessage(
          `😢 সব সুযোগ শেষ!\n✅ সঠিক উত্তর ছিল ➤ ${correctAnswer}`,
          event.threadID,
          event.messageID
        );
      }
    }
  }
};