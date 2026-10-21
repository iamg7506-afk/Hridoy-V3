const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";
const TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "tokai",
    aliases: ["stepped"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Target er pic jutar niche 👟",
    category: "Tag Fun",
    guide: { en: "{pn}step @tag" },
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
      return message.reply("❌ Usage:\n• .step @user\n• .step (reply)\n• .step <uid>");
    }

    try {
      const { data: cfg } = await axios.get(`${BASE}/api/images/tokai`);
      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${TOKEN}`;

      const [bg, avatar] = await Promise.all([loadImage(cfg.url), loadImage(targetURL)]);

      const W = bg.width;
      const H = bg.height;

      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, W, H);

      const kx = W / cfg.refSize.w, ky = H / cfg.refSize.h;
      const k = Math.min(kx, ky);

      const p = cfg.positions.target;
      const cx = p.cx * kx;
      const cy = p.cy * ky;
      const r = p.r * k;

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
        ctx.lineWidth = cfg.border.lineWidth;
        ctx.strokeStyle = cfg.border.color;
        ctx.stroke();
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outPath = path.join(cacheDir, `step_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

      const hasMention = Object.keys(mentions).length > 0;
      const name = hasMention ? Object.values(mentions)[0] : "";

      const list = hasMention ? cfg.messages : (cfg.messagesNoTag || cfg.messages);
      const msgs = list && list.length ? list : [""];
      const body = msgs[Math.floor(Math.random() * msgs.length)].split("{target}").join(name);

      return message.reply({
        body,
        attachment: fs.createReadStream(outPath),
        mentions: hasMention ? [{ tag: name, id: targetID }] : [],
      });

    } catch (err) {
      console.error("Step error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
