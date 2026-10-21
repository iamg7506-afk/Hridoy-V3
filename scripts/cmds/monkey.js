const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "monkey",
    aliases: ["mnky"],
    version: "3.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Monkey face swap 🐒",
    category: "Tag Fun",
    guide: { en: "{pn}hulu @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, mentions } = event;

    let targetID, targetName;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      targetName = Object.values(mentions)[0].replace(/@/g, "");
    } else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
      try {
        const info = await api.getUserInfo(targetID);
        targetName = info[targetID]?.name || "User";
      } catch (_) { targetName = "User"; }
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
      try {
        const info = await api.getUserInfo(targetID);
        targetName = info[targetID]?.name || "User";
      } catch (_) { targetName = "User"; }
    } else {
      return message.reply("❌ Usage:\n• .monkey @user\n• .monkey (reply)\n• .monkey <uid>");
    }

    try {
      const { data: cfg } = await axios.get(`${BASE}/api/images/monkey`);

      const W = cfg.canvasSize?.w || 1024;
      const H = cfg.canvasSize?.h || 1024;
      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [bg, avatar] = await Promise.all([
        loadImage(cfg.url),
        loadImage(targetURL),
      ]);

      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, W, H);

      const pos = cfg.positions.target;
      const cx = pos.cx;
      const cy = pos.cy;
      const r  = pos.r;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      if (cfg.border) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = cfg.border.color;
        ctx.lineWidth = cfg.border.lineWidth;
        ctx.stroke();
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const outPath = path.join(cacheDir, `hulu_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

      const msgs = cfg.messages || ["😝 {target} = monkey confirmed! 😂"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)]
        .replace("{target}", targetName);

      return message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

    } catch (err) {
      console.error("hulu error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
