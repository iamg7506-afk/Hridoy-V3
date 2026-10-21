const axios = require("axios");
const money = require("../../utils/money"); // ⚠️ path ঠিক করবি

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
  return base.data.mahmud;
};

/**
* @author MahMUD
* @author: do not delete it
*/

module.exports = {
  config: {
    name: "cricket",
    aliases: ["cricket"],
    version: "1.8",
    author: "MahMUD",
    countDown: 10,
    role: 0,
    category: "Game",
    guide: { en: "{pn}" }
  },

  onReply: async function ({ api, event, Reply, usersData }) {
    const { cricketNames, author, messageID } = Reply;
    const getCoin = 500;
    const getExp = 121;

    if (event.senderID !== author) {
      return api.sendMessage("𝐓𝐡𝐢𝐬 𝐢𝐬 𝐧𝐨𝐭 𝐲𝐨𝐮𝐫 𝐪𝐮𝐢𝐳 𝐛𝐚𝐛𝐲 >🐸", event.threadID, event.messageID);
    }

    const reply = event.body.trim().toLowerCase();
    const isCorrect = cricketNames.some(name => name.toLowerCase() === reply);

    await api.unsendMessage(messageID);

    if (isCorrect) {
      // ✅ money.js দিয়ে coin add
      await money.add(event.senderID, getCoin);

      // exp usersData তেই থাকবে
      const userData = await usersData.get(event.senderID);
      await usersData.set(event.senderID, {
        money: userData.money, // money এখন money.js handle করবে
        exp: userData.exp + getExp,
        data: userData.data
      });

      return api.sendMessage(
        `✅ | Correct answer baby.\nYou have earned ${getCoin} coins and ${getExp} exp.`,
        event.threadID,
        event.messageID
      );
    } else {
      return api.sendMessage(
        `❌ | Wrong answer baby.\nCorrect answer was: ${cricketNames.join(" / ")}`,
        event.threadID,
        event.messageID
      );
    }
  },

  onStart: async function ({ api, event }) {
    const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68);
    if (module.exports.config.author !== obfuscatedAuthor) {
      return api.sendMessage(
        "You are not authorized to change the author name.\n",
        event.threadID,
        event.messageID
      );
    }

    try {
      const apiUrl = await baseApiUrl();
      const response = await axios.get(`${apiUrl}/api/cricket`);
      const { name, imgurLink } = response.data.cricket;
      const cricketNames = Array.isArray(name) ? name : [name];

      const imageStream = await axios({
        url: imgurLink,
        method: "GET",
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      api.sendMessage(
        {
          body: "A famous cricketer has appeared! Guess their name.",
          attachment: imageStream.data
        },
        event.threadID,
        (err, info) => {
          if (err) return;
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            type: "reply",
            messageID: info.messageID,
            author: event.senderID,
            cricketNames
          });

          setTimeout(() => api.unsendMessage(info.messageID), 40000);
        },
        event.messageID
      );
    } catch (error) {
      console.error("Error:", error.message);
      api.sendMessage("🥹error, contact Kakashi.", event.threadID, event.messageID);
    }
  }
};