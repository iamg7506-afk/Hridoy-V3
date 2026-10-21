const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "bra",
    aliases: ["brasize"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Size fun command 📏",
    category: "Tag Fun",
    guide: { en: "{pn}bra @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { mentions } = event;

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
      return message.reply("❌ Usage:\n• .size @user\n• .size (reply)\n• .size <uid>");
    }

    try {
      const { data: cfg } = await axios.get(`${BASE}/api/images/bra`);

      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const [bg, avatar] = await Promise.all([
        loadImage(cfg.url),
        loadImage(targetURL),
      ]);

      const canvas = createCanvas(bg.width, bg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, bg.width, bg.height);

      const W = bg.width;
      const H = bg.height;
      const pos = cfg.positions.target;
      const cx = W * pos.cx_pct;
      const cy = H * pos.cy_pct;
      const r  = W * pos.r_pct;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const outPath = path.join(cacheDir, `size_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

      const msgs = cfg.messages || ["@{target} pom pom তো ভালোই বড় করছো! 😂"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)]
        .replace("{target}", targetName)
        .replace("@{target}", `@${targetName}`);

      return message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

    } catch (err) {
      console.error("bra error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
