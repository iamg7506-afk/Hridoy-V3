const axios = require("axios");
const money = require("../../utils/money");

async function toFont(text, id = 3) {
  try {
    const GITHUB_RAW = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
    const rawRes = await axios.get(GITHUB_RAW);
    const apiBase = rawRes.data.apiv1;

    const apiUrl = `${apiBase}/api/font?id=${id}&text=${encodeURIComponent(text)}`;
    const { data } = await axios.get(apiUrl);
    return data.output || text;
  } catch (e) {
    console.error("Font API error:", e.message);
    return text;
  }
}

module.exports = {
  config: {
    name: "narutoquiz",
    aliases: ["naruquiz", "nqz", "narutoqz"],
    version: "2.1",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    category: "Game",
    guide: { en: "{pn} — Naruto character guessing quiz" }
  },

  onStart: async function ({ api, event }) {
    try {

      const GITHUB_RAW = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
      const rawRes = await axios.get(GITHUB_RAW);
      const quizApiBase = rawRes.data.apiv1;

      const { data } = await axios.get(`${quizApiBase}/api/narutoqz`);
      const { image, options, answer } = data;

      const imageStream = await axios({
        method: "GET",
        url: image,
        responseType: "stream"
      });

      const body = await toFont(`🥷 𝐍𝐚𝐫𝐮𝐭𝐨 𝐐𝐮𝐢𝐳 🍃
━━━━━━━━━━━━━━
📷 Guess the Naruto character!

🅐 ${options.A}
🅑 ${options.B}
🅒 ${options.C}
🅓 ${options.D}

⏳ You have 1 minute 30 seconds!
💡 You have 3 chances! Reply with A, B, C or D.`);

      api.sendMessage(
        { body, attachment: imageStream.data },
        event.threadID,
        async (err, info) => {

          if (err) return console.error(err);

          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
            correctAnswer: answer,
            chances: 3,
            answered: false
          });

          setTimeout(async () => {

            const quizData = global.GoatBot.onReply.get(info.messageID);

            if (quizData && !quizData.answered) {
              try {
                await api.unsendMessage(info.messageID);
                global.GoatBot.onReply.delete(info.messageID);
              } catch (e) {
                console.error(e);
              }
            }

          }, 90000);

        },
        event.messageID
      );

    } catch (err) {

      console.error(err);

      const failMsg = await toFont("❌ Failed to fetch Naruto quiz data.");
      api.sendMessage(failMsg, event.threadID, event.messageID);

    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {

    let { author, correctAnswer, messageID, chances } = Reply;

    const reply = event.body?.trim().toUpperCase();

    if (event.senderID !== author) {
      const msg = await toFont("⚠️ This is not your quiz!");
      return api.sendMessage(msg, event.threadID, event.messageID);
    }

    if (!reply || !["A", "B", "C", "D"].includes(reply)) {
      const msg = await toFont("❌ Please reply with A, B, C or D.");
      return api.sendMessage(msg, event.threadID, event.messageID);
    }

    if (reply === correctAnswer) {

      try {
        await api.unsendMessage(messageID);
      } catch {}

      const rewardCoin = 500;
      const rewardExp = 150;

      // ✅ money.js দিয়ে coins add
      await money.add(author, rewardCoin);

      // EXP usersData তে add
      const userData = await usersData.get(author);

      await usersData.set(author, {
        money: userData.money,
        exp: userData.exp + rewardExp,
        data: userData.data
      });

      const correctMsg = await toFont(`🍥 Dattebayo! 🎉

✅ You answered correctly!
💰 +${rewardCoin} Coins
🌟 +${rewardExp} EXP

🔥 You truly know your Naruto world!`);

      if (global.GoatBot.onReply.has(messageID)) {
        global.GoatBot.onReply.get(messageID).answered = true;
        global.GoatBot.onReply.delete(messageID);
      }

      return api.sendMessage(correctMsg, event.threadID, event.messageID);

    } else {

      chances--;

      if (chances > 0) {

        global.GoatBot.onReply.set(messageID, { ...Reply, chances });

        const wrongTryMsg = await toFont(`❌ Wrong answer!
⏳ You still have ${chances} chance(s) left. Try again!`);

        return api.sendMessage(wrongTryMsg, event.threadID, event.messageID);

      } else {

        try {
          await api.unsendMessage(messageID);
        } catch {}

        const wrongMsg = await toFont(`🥺 Out of chances!
✅ The correct option was: ${correctAnswer}`);

        return api.sendMessage(wrongMsg, event.threadID, event.messageID);
      }
    }
  }
};