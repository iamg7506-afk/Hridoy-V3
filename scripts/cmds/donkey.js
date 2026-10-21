const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "donkey",
    aliases: ["gadha"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Convert someone into a donkey" },
    longDescription: { en: "Put user's profile picture on a donkey image using canvas" },
    category: "Tag Fun",
    guide: { en: "{pn} @mention / reply / UID" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, type, messageReply, senderID } = event;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    let targetID;
    if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args.length > 0 && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      targetID = senderID;
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
    const outPath = path.join(cacheDir, `donkey_${targetID}_${Date.now()}.png`);

    try {
      // Fetch background + overlay position + captions from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/donkey`);

      const userInfo = await api.getUserInfo(targetID);
      const name = userInfo[targetID].name;

      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [bg, avatar] = await Promise.all([
        loadImage(cfg.url),
        loadImage(targetURL),
      ]);

      const canvas = createCanvas(bg.width, bg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, bg.width, bg.height);

      const { x, y, w, h, shape } = cfg.overlay;

      ctx.save();
      if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
      }
      ctx.drawImage(avatar, x, y, w, h);
      ctx.restore();

      fs.writeFileSync(outPath, canvas.toBuffer());

      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : ["{target}, tokay gadha banaye dilam 🐴"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)].replace("{target}", name);

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage({
        body: caption,
        attachment: fs.createReadStream(outPath),
      }, threadID, () => {
        try { fs.unlinkSync(outPath); } catch (_) {}
      }, messageID);

    } catch (e) {
      console.error("Donkey error:", e);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("Command execution failed ❌", threadID, messageID);
    }
  }
};
