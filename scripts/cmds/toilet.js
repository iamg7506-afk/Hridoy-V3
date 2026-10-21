const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "toilet",
    version: "4.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    category: "Tag Fun",
    guide: { en: "{pn} @mention / reply / UID" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, type, messageReply, mentions } = event;
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    api.setMessageReaction("⏳", messageID, () => {}, true);

    let targetID;
    if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args.length > 0) {
      targetID = args[0];
    } else {
      targetID = senderID;
    }

    try {
      // Fetch background + overlay position + caption from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/toilet`);

      const [background, avatar] = await Promise.all([
        loadImage(cfg.url),
        loadImage(`https://graph.facebook.com/${targetID}/picture?width=1000&height=1000&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)
      ]);

      const canvas = createCanvas(background.width, background.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      const { x, y, w, h } = cfg.overlay;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, x, y, w, h);
      ctx.restore();

      const cachePath = path.join(cacheDir, `toilet_${targetID}.png`);
      fs.writeFileSync(cachePath, canvas.toBuffer());

      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : ["You deserve this place 🤧🔥"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)];

      return api.sendMessage({
        body: caption,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
        fs.unlinkSync(cachePath);
      }, messageID);

    } catch (e) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Error processing image", threadID, messageID);
    }
  }
};
