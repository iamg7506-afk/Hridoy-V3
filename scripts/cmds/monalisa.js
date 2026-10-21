const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";
const TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "monalisa",
    aliases: ["mona", "lisa"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Mona Lisa fun command 🖼️",
    category: "Tag Fun",
    guide: { en: "{pn}monalisa @tag" },
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
      return message.reply("❌ Usage:\n• .monalisa @user\n• .monalisa (reply)\n• .monalisa <uid>");
    }

    try {
      // Background + face position + captions all come from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/monalisa`);
      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${TOKEN}`;

      const [bg, avatar] = await Promise.all([loadImage(cfg.url), loadImage(targetURL)]);

      const canvas = createCanvas(bg.width, bg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, bg.width, bg.height);

      const W = bg.width;
      const H = bg.height;
      const p = cfg.positions.target;
      const faceCX = W * p.cx_pct;
      const faceCY = H * p.cy_pct;
      const faceRX = W * p.rx_pct;
      const faceRY = H * p.ry_pct;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(faceCX, faceCY, faceRX, faceRY, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, faceCX - faceRX, faceCY - faceRY, faceRX * 2, faceRY * 2);
      ctx.restore();

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outPath = path.join(cacheDir, `monalisa_${Date.now()}.png`);
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
      console.error("Monalisa error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
