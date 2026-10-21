const axios = require("axios");
const money = require("../../utils/money"); // path ঠিক রাখবি

const getBaseApi = async () => {
  try {
    const res = await axios.get(
      "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json"
    );
    return res.data.mahmud;
  } catch (e) {
    return null;
  }
};

module.exports = {
  config: {
    name: "aniqz2",
    aliases: ["animeqz2"],
    version: "1.8.1",
    author: "MahMUD",
    countDown: 10,
    role: 0,
    category: "Game",
    guide: { en: "{pn} [en/bn]" }
  },

  onStart: async function ({ api, event, args, usersData }) {
    try {
      const lang = (args[0] || "bn").toLowerCase();
      const category = (lang === "en" || lang === "english") ? "english" : "bangla";

      const baseApi = await getBaseApi();
      if (!baseApi) {
        return api.sendMessage(
          "❌ API base not found!",
          event.threadID,
          event.messageID
        );
      }

      const res = await axios.get(`${baseApi}/api/aniqz2?category=${category}`);
      const quiz = res.data?.data || res.data;

      if (!quiz?.question) {
        return api.sendMessage(
          "❌ No quiz found!",
          event.threadID,
          event.messageID
        );
      }

      const { question, correctAnswer, options } = quiz;

      const msg = {
        body:
`╭──✦ 𝑸𝑼𝑰𝒁 ✦──╮
│ ${question}
├ A) ${options.a}
├ B) ${options.b}
├ C) ${options.c}
├ D) ${options.d}
╰──────────────╯
Reply with A/B/C/D`
      };

      api.sendMessage(msg, event.threadID, (err, info) => {
        if (err) return;

        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name, // 🔥 FIX MAIN BUG
          author: event.senderID,
          correctAnswer: correctAnswer.toLowerCase(),
          messageID: info.messageID
        });

        setTimeout(() => {
          api.unsendMessage(info.messageID);
        }, 40000);
      });

    } catch (err) {
      console.log(err);
      api.sendMessage(
        "🥹 Error occurred, try again later.",
        event.threadID,
        event.messageID
      );
    }
  },

  onReply: async function ({ event, api, Reply, usersData }) {
    try {
      if (!Reply || event.senderID !== Reply.author) return;

      await api.unsendMessage(Reply.messageID);

      const userAnswer = event.body.trim().toLowerCase();
      const correct = Reply.correctAnswer;

      const validMap = {
        a: "a",
        b: "b",
        c: "c",
        d: "d"
      };

      const isCorrect =
        userAnswer === correct ||
        validMap[userAnswer] === correct;

      if (isCorrect) {
        const rewardCoins = 500;
        const rewardExp = 121;

        await money.add(event.senderID, rewardCoins);

        const userData = await usersData.get(event.senderID);

        await usersData.set(event.senderID, {
          money: (userData.money || 0),
          exp: (userData.exp || 0) + rewardExp,
          data: userData.data || {}
        });

        return api.sendMessage(
          `✅ Correct answer!\n+${rewardCoins} coins 💰\n+${rewardExp} exp ⭐`,
          event.threadID,
          event.messageID
        );

      } else {
        return api.sendMessage(
          `❌ Wrong answer!\nCorrect: ${correct.toUpperCase()}`,
          event.threadID,
          event.messageID
        );
      }

    } catch (err) {
      console.log(err);
      return api.sendMessage(
        "❌ Reply error occurred!",
        event.threadID,
        event.messageID
      );
    }
  }
};