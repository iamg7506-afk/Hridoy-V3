const axios = require("axios");
const money = require("../../utils/money");

async function toFont(text, id = 22) {
  try {
    const RAW = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
    const raw = await axios.get(RAW);
    const base = raw.data.apiv1;

    const api = `${base}/api/font?id=${id}&text=${encodeURIComponent(text)}`;
    const { data } = await axios.get(api);

    return data.output || text;
  } catch {
    return text;
  }
}

module.exports = {
  config: {
		shortDescription: "Aniqz (Game)", // auto-added: was missing, caused blank entry in help
    name: "aniqz",
    aliases: ["animeqz", "aniquiz", "animequiz"],
    version: "2.1",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    category: "Game",
    guide: { en: "{pn} — Guess the anime character!" }
  },

  onStart: async function ({ api, event }) {
    try {

      const RAW = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
      const raw = await axios.get(RAW);
      const base = raw.data.apiv1;

      const res = await axios.get(`${base}/api/animequiz`);
      const { image, options, answer } = res.data;

      const img = await axios({
        url: image,
        method: "GET",
        responseType: "stream"
      });

      const body = await toFont(
`🎌 Anime Quiz 🎭
━━━━━━━━━━━━━━

🅐 ${options.A}
🅑 ${options.B}
🅒 ${options.C}
🅓 ${options.D}

⏳ Time: 90s
💡 Chances: 3

Reply with A/B/C/D`
      );

      api.sendMessage({
        body,
        attachment: img.data
      },
      event.threadID,
      async (err, info) => {

        if (err) return;

        global.GoatBot.onReply.set(info.messageID,{
          commandName: "animequiz",
          author: event.senderID,
          correctAnswer: answer,
          chances: 3,
          messageID: info.messageID
        });

        setTimeout(()=>{
          api.unsendMessage(info.messageID);
        },90000);

      },
      event.messageID);

    } catch (e) {
      console.log(e);
      api.sendMessage("❌ Failed to fetch Anime Quiz.",event.threadID,event.messageID);
    }
  },

  onReply: async function ({ api, event, Reply, usersData }) {

    const { author, correctAnswer, messageID } = Reply;

    if (event.senderID !== author)
      return api.sendMessage("⚠️ This quiz is not yours.",event.threadID,event.messageID);

    const reply = event.body.trim().toUpperCase();

    if (!["A","B","C","D"].includes(reply))
      return api.sendMessage("❌ Reply with A/B/C/D",event.threadID,event.messageID);

    let chances = Reply.chances;

    if (reply === correctAnswer) {

      await api.unsendMessage(messageID);

      const rewardCoins = 500;
      const rewardExp = 150;

      // ✅ money.js economy system
      await money.add(author, rewardCoins);

      const userData = await usersData.get(author);

      await usersData.set(author,{
        money: userData.money,
        exp: userData.exp + rewardExp,
        data: userData.data
      });

      global.GoatBot.onReply.delete(messageID);

      const msg = await toFont(
`🎯 Sugoi!

✅ Correct Answer
💰 +${rewardCoins} Coins
🌟 +${rewardExp} EXP

🏆 True Anime Fan!`
      );

      return api.sendMessage(msg,event.threadID,event.messageID);
    }

    chances--;

    if (chances > 0) {

      global.GoatBot.onReply.set(messageID,{
        ...Reply,
        chances
      });

      return api.sendMessage(
        `❌ Wrong answer\n⏳ Chances left: ${chances}`,
        event.threadID,
        event.messageID
      );

    } else {

      await api.unsendMessage(messageID);

      global.GoatBot.onReply.delete(messageID);

      return api.sendMessage(
        `😢 Out of chances!\n✅ Correct answer: ${correctAnswer}`,
        event.threadID,
        event.messageID
      );
    }
  }
};