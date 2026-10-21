const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";
const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
const picURL = (id) =>
  `https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=${token}`;

module.exports = {
  config: {
    name: "chata",
    aliases: ["chato", "lick"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "pa chata 🤡",
    category: "Tag Fun",
    guide: { en: "{pn}lick @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { mentions } = event;
    const senderID = event.senderID;

    let targetID;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("❌ Usage:\n• .chata @user\n• .chata (reply)\n• .chata <uid>");
    }

    try {
      // Background + circle positions + captions from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/chata`);

      const [bg, targetImg, senderImg] = await Promise.all([
        loadImage(cfg.url),
        loadImage(picURL(targetID)),
        loadImage(picURL(senderID)),
      ]);

      const W = bg.width;
      const H = bg.height;

      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, W, H);

      const kx = W / cfg.refSize.w, ky = H / cfg.refSize.h;
      const k = Math.min(kx, ky);

      const drawCircle = (img, pos) => {
        const cx = pos.cx * kx, cy = pos.cy * ky, r = pos.r * k;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();

        if (cfg.border) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.lineWidth = cfg.border.lineWidth;
          ctx.strokeStyle = cfg.border.color;
          ctx.stroke();
        }
      };

      drawCircle(senderImg, cfg.positions.sender);
      drawCircle(targetImg, cfg.positions.target);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outPath = path.join(cacheDir, `lick_${Date.now()}.png`);
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
      console.error("Lick error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
