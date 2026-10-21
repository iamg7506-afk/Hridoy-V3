const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "married2",
    version: "1.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Generate married banner",
    longDescription: "Generate a couple banner image using sender and target Facebook UID",
    category: "Love",
    guide: {
      en: "{pn} @mention/reply"
    }
  },

  onStart: async function ({ api, event }) {
    const {
      threadID,
      messageID,
      mentions,
      messageReply,
      senderID
    } = event;

    let targetID = null;

    // Mention detect
    if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    }

    // Reply detect
    else if (messageReply && messageReply.senderID) {
      targetID = messageReply.senderID;
    }

    // No target
    if (!targetID) {
      return api.sendMessage(
        "Please reply or mention someone......",
        threadID,
        messageID
      );
    }

    try {
      // Fetch API list
      const apiList = await axios.get(
        "https://raw.githubusercontent.com/shahadat-sahu/SAHU-API/refs/heads/main/SAHU-API.json"
      );

      const AVATAR_CANVAS_API = apiList.data.AvatarCanvas;

      // Generate banner
      const res = await axios.post(
        `${AVATAR_CANVAS_API}/api`,
        {
          cmd: "married2",
          senderID,
          targetID
        },
        {
          responseType: "arraybuffer",
          timeout: 30000
        }
      );

      // Cache directory
      const cacheDir = path.join(__dirname, "cache");

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const imgPath = path.join(
        cacheDir,
        `married2_${senderID}_${targetID}.png`
      );

      fs.writeFileSync(imgPath, res.data);

      // Send image
      return api.sendMessage(
        {
          body: "তোমাদের বিয়ে এখন অফিসিয়ালি সম্পন্ন হলো! 🥰",
          attachment: fs.createReadStream(imgPath)
        },
        threadID,
        () => {
          if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        },
        messageID
      );

    } catch (error) {
      console.error(error);

      return api.sendMessage(
        "API Error Call Boss Hridoy",
        threadID,
        messageID
      );
    }
  }
};
