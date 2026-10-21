const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

function drawCircle(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

module.exports = {
  config: {
    name: "pet",
    aliases: ["dog", "chop"],
    version: "1.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "GTA pet fun command 🐕",
    category: "Tag Fun",
    guide: { en: "{pn}pet @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, mentions } = event;

    let targetID;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("❌ Usage:\n• .pet @user\n• .pet (reply)\n• .pet <uid>");
    }

    try {
      // Fetch image config from API
      const { data: cfg } = await axios.get(`${BASE}/api/images/pet`);

      const senderURL = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [bg, senderAvatar, targetAvatar] = await Promise.all([
        loadImage(cfg.url),
        loadImage(senderURL),
        loadImage(targetURL),
      ]);

      const canvas = createCanvas(bg.width, bg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, bg.width, bg.height);

      const W = bg.width;
      const H = bg.height;

      const dogPos = cfg.positions.target;
      const humPos = cfg.positions.sender;

      drawCircle(ctx, targetAvatar, W * dogPos.cx_pct, H * dogPos.cy_pct, W * dogPos.r_pct);
      drawCircle(ctx, senderAvatar, W * humPos.cx_pct, H * humPos.cy_pct, W * humPos.r_pct);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outPath = path.join(cacheDir, `pet_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

      const targetName = Object.values(mentions)[0] || "User";
      const msgs = cfg.messages || ["🐕 Chop er jaigai {target}! Walking time! 😂🎮"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)].replace("{target}", targetName);

      return message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

    } catch (err) {
      console.error("Pet command error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
