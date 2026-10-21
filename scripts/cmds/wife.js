const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "wife",
    version: "1.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Wife Banner",
    longDescription: "Generate cute wife banner using mention or reply",
    category: "Love",
    guide: {
      en: "{pn} @mention\nor reply someone's message and type {pn}"
    }
  },

  onStart: async function ({ api, event }) {
    const { senderID, mentions, messageReply, threadID, messageID } = event;

    let targetID;

    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (messageReply) {
      targetID = messageReply.senderID;
    }

    if (!targetID) {
      return api.sendMessage(
        "❌ | Please mention or reply to someone.",
        threadID,
        messageID
      );
    }

    try {
      const apiList = await axios.get(
        "https://raw.githubusercontent.com/shahadat-sahu/SAHU-API/refs/heads/main/SAHU-API.json"
      );

      const AVATAR_CANVAS_API = apiList.data.AvatarCanvas;

      const res = await axios.post(
        `${AVATAR_CANVAS_API}/api`,
        {
          cmd: "love3",
          senderID,
          targetID
        },
        {
          responseType: "arraybuffer",
          timeout: 20000
        }
      );

      const filePath = path.join(
        __dirname,
        "cache",
        `wife_${senderID}_${targetID}.png`
      );

      fs.ensureDirSync(path.dirname(filePath));
      fs.writeFileSync(filePath, res.data);

      await api.sendMessage(
        {
          body: "❤️ Your Cute Sweet Wife ❤️",
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => {
          if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
        },
        messageID
      );

    } catch (err) {
      console.error(err);
      api.sendMessage(
        "❌ | API Error! Please try again later.",
        threadID,
        messageID
      );
    }
  }
};
