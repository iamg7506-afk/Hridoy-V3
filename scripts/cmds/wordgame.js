const axios = require("axios");

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
		shortDescription: "Wordgame (Game)", // auto-added: was missing, caused blank entry in help
    name: "wordgame",
    aliases: ["wordguss", "word"],
    version: "1.2",
    author: "MahMUD",
    role: 0,
    category: "Game",
    guide: {
      en: "{pn} Start the word guessing game"
    }
  },

  onStart: async function ({ api, event }) {
    try {
      const apiUrl = await baseApiUrl();  
      const response = await axios.get(`${apiUrl}/api/word/random`);
      const randomWord = response.data.word;
      const shuffledWord = shuffleWord(randomWord);

      api.sendMessage(
        `𝐆𝐮𝐞𝐬𝐬 𝐭𝐡𝐞 𝐰𝐨𝐫𝐝: "${shuffledWord}" ?`,
        event.threadID,
        (err, info) => {
          if (err) return;
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            answer: randomWord
          });
        },
        event.messageID
      );

    } catch (err) {
      api.sendMessage("❌ Failed to fetch a word from the API.", event.threadID, event.messageID);
    }
  },

  onReply: async function ({ api, Reply, event, usersData }) {
    const { author, answer, messageID } = Reply;

    if (event.senderID !== author)
      return api.sendMessage("Not your turn baka 🐸🦎", event.threadID, event.messageID);

    const userReply = event.body.trim().toLowerCase();
    const correct = answer.toLowerCase();

    const userData = await usersData.get(author);

    await api.unsendMessage(messageID);

    if (userReply === correct) {
      const rewardCoins = 300;
      const rewardExp = 80;

      await usersData.set(author, {
        money: userData.money + rewardCoins,
        exp: userData.exp + rewardExp,
        data: userData.data
      });

      return api.sendMessage(
        `✅ | Correct baby!\nYou earned +${rewardCoins} coins & +${rewardExp} exp.`,
        event.threadID,
        event.messageID
      );
    } else {
      return api.sendMessage(
        `❌ | Wrong Answer baby\nThe Correct answer was: ${answer}`,
        event.threadID,
        event.messageID
      );
    }
  }
};

function shuffleWord(word) {
  const shuffled = word.split('').sort(() => 0.5 - Math.random()).join('');
  return shuffled === word ? shuffleWord(word) : shuffled;
}