const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";
const TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "chicken",
    aliases: ["hen"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Chicken yoga fun command 🐔",
    category: "Tag Fun",
    guide: { en: "{pn}chicken @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { mentions } = event;

    let targetID;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("❌ Usage:\n• .chicken @user\n• .chicken (reply)\n• .chicken <uid>");
    }

    try {
      const { data: cfg } = await axios.get(`${BASE}/api/images/chicken`);
      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${TOKEN}`;

      const [bg, targetAvatar] = await Promise.all([loadImage(cfg.url), loadImage(targetURL)]);

      const canvas = createCanvas(bg.width, bg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, bg.width, bg.height);

      const W = bg.width;
      const H = bg.height;
      const p = cfg.positions.target;
      const faceCX = W * p.cx_pct;
      const faceCY = H * p.cy_pct;
      const faceR = W * p.r_pct;

      ctx.save();
      ctx.beginPath();
      ctx.arc(faceCX, faceCY, faceR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(targetAvatar, faceCX - faceR, faceCY - faceR, faceR * 2, faceR * 2);
      ctx.restore();

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outPath = path.join(cacheDir, `chicken_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

      const targetName = Object.values(mentions)[0] || "User";
      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : ["{target}"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)].split("{target}").join(targetName);

      return message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

    } catch (err) {
      console.error("Chicken error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
