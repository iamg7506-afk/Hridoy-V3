const axios = require("axios");
const money = require("../../utils/money"); // ⚠️ path ঠিক করবি

const getBaseApi = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
  return base.data.mahmud;
};

module.exports = {
  config: {
		shortDescription: "Mathgame (Game)", // auto-added: was missing, caused blank entry in help
    name: "mathgame",
    aliases: ["math"],
    version: "1.9",
    author: "MahMUD",
    role: 0,
    category: "Game",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event }) {
    const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68); 
    if (module.exports.config.author !== obfuscatedAuthor) {
      return api.sendMessage("❌ You are not authorized to change the author name.", event.threadID, event.messageID);
    }

    const { senderID, threadID, messageID } = event;

    let quiz;
    try {
      const apiUrl = await getBaseApi();
      const res = await axios.get(`${apiUrl}/api/math`);
      const apiData = res.data;
      quiz = apiData?.data || apiData;

      if (!quiz || !quiz.question || !quiz.options || !quiz.correctAnswer) {
        return api.sendMessage("❌ No valid quiz found from API.", threadID, messageID);
      }
    } catch (err) {
      return api.sendMessage("error, contact Kakashi.", threadID, messageID);
    }

    const { question, correctAnswer, options } = quiz;
    const { a, b, c, d } = options;

    const quizMsg = {
      body: `\n╭──✦ ${question}\n├‣ 𝗔) ${a}\n├‣ 𝗕) ${b}\n├‣ 𝗖) ${c}\n├‣ 𝗗) ${d}\n╰──────────────────‣\n𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡 𝐲𝐨𝐮𝐫 𝐚𝐧𝐬𝐰𝐞𝐫.`
    };

    api.sendMessage(quizMsg, threadID, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        type: "mathquiz",
        commandName: "mathgame",
        author: senderID,
        messageID: info.messageID,
        correctAnswer,
        answered: false
      });
    }, messageID);
  },

  onReply: async function ({ event, api, Reply, usersData }) {
    const { correctAnswer, author } = Reply;

    if (event.senderID !== author)
      return api.sendMessage("❌ This isn't your math quiz!", event.threadID, event.messageID);

    if (Reply.answered)
      return api.sendMessage("❌ You've already answered this quiz!", event.threadID, event.messageID);

    Reply.answered = true;

    const reply = event.body.trim().toLowerCase();
    const correctAns = correctAnswer.toLowerCase();

    const rewardCoins = 500;
    const rewardExp = 121;

    await api.unsendMessage(Reply.messageID);

    if (reply === correctAns) {
      // ✅ coin → money.js
      await money.add(author, rewardCoins);

      // ✅ exp → usersData
      const userData = await usersData.get(author);
      await usersData.set(author, {
        money: userData.money,
        exp: userData.exp + rewardExp,
        data: userData.data
      });

      return api.sendMessage(
        `✅ | Correct answer baby\nYou earned +${rewardCoins} coins & +${rewardExp} exp!`,
        event.threadID,
        event.messageID
      );
    } else {
      return api.sendMessage(
        `❌ | Wrong answer baby\nThe Correct answer was: ${correctAnswer}`,
        event.threadID,
        event.messageID
      );
    }
  }
};