const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "gym",
    aliases: ["muscle", "buff"],
    version: "1.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Gym buff fun command 💪",
    category: "Tag Fun",
    guide: { en: "{pn}gym @tag" },
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
      return message.reply("❌ Usage:\n• .gym @user\n• .gym (reply)\n• .gym <uid>");
    }

    try {
      // Fetch image config from API
      const { data: cfg } = await axios.get(`${BASE}/api/images/gym`);

      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const [bg, targetAvatar] = await Promise.all([
        loadImage(cfg.url),
        loadImage(targetURL),
      ]);

      const canvas = createCanvas(bg.width, bg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, bg.width, bg.height);

      const W = bg.width;
      const H = bg.height;
      const pos = cfg.positions.target;

      const faceCX = W * pos.cx_pct;
      const faceCY = H * pos.cy_pct;
      const faceR  = W * pos.r_pct;

      ctx.save();
      ctx.beginPath();
      ctx.arc(faceCX, faceCY, faceR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(targetAvatar, faceCX - faceR, faceCY - faceR, faceR * 2, faceR * 2);
      ctx.restore();

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outPath = path.join(cacheDir, `gym_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

      const targetName = Object.values(mentions)[0] || "User";
      const msgs = cfg.messages || ["💪 {target} gym e giye ei obostha hoye gache! Beast mode ON! 🔥"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)].replace("{target}", targetName);

      return message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

    } catch (err) {
      console.error("Gym command error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
