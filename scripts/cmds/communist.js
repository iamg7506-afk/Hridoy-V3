const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const FB_TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";

module.exports = {
  config: {
    name: "communist",
    version: "2.1",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Apply communism effect to profile photo" },
    description: { en: "Adds a communist-style red filter to avatar" },
    category: "Tag Fun",
    guide: { en: "{p}communist [@mention or reply]" }
  },

  onStart: async function ({ api, event, message }) {
    const { senderID, mentions, type, messageReply } = event;

    let uid;
    if (Object.keys(mentions).length > 0) uid = Object.keys(mentions)[0];
    else if (type === "message_reply") uid = messageReply.senderID;
    else uid = senderID;

    const avatarURL = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${FB_TOKEN}`;

    try {
      const cfg = await axios.get(`${API_BASE}/api/links/communist`);
      const apiBase = cfg.data?.url;
      if (!apiBase) throw new Error("No config");

      const res = await axios.get(`${apiBase}?image=${encodeURIComponent(avatarURL)}`, { responseType: "arraybuffer" });

      const filePath = path.join(__dirname, "cache", `communism_${uid}.jpg`);
      fs.writeFileSync(filePath, res.data);

      message.reply({
        body: "☭ | The revolution has begun!",
        attachment: fs.createReadStream(filePath)
      }, () => fs.unlinkSync(filePath));
    } catch (err) {
      message.reply("❌ | Failed to generate Communist meme.");
    }
  }
};
