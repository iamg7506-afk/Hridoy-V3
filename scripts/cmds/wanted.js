const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";
const TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "wanted",
    aliases: ["bounty", "deadoralive"],
    version: "3.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "One Piece Wanted Poster 🏴‍☠️",
    category: "Tag Fun",
    guide: { en: "{pn}wanted @tag" },
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
      return message.reply("❌ Usage:\n• .wanted @user\n• .wanted (reply)\n• .wanted <uid>");
    }

    try {
      // Poster background, photo box, text slots, bounty list & captions from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/wanted`);
      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${TOKEN}`;

      // Target name
      let targetName = "UNKNOWN";
      try {
        const info = await api.getUserInfo(targetID);
        targetName = (info[targetID]?.name || "UNKNOWN").toUpperCase();
      } catch (_) {}

      const [bg, avatar] = await Promise.all([loadImage(cfg.url), loadImage(targetURL)]);

      const W = bg.width;
      const H = bg.height;

      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, W, H);

      // ── Photo box (cover-fit, face a bit higher) ──
      const box = cfg.positions.target;
      const boxX = box.x, boxY = box.y, boxW = box.w, boxH = box.h;

      const aw = avatar.width, ah = avatar.height;
      const scale = Math.max(boxW / aw, boxH / ah);
      const sw = boxW / scale, sh = boxH / scale;
      const sx = (aw - sw) / 2;
      const sy = (ah - sh) * (box.focusY ?? 0.5);

      ctx.save();
      ctx.beginPath();
      ctx.rect(boxX, boxY, boxW, boxH);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, sx, sy, sw, sh, boxX, boxY, boxW, boxH);
      ctx.restore();

      // ── Text helper ──
      const t = cfg.text;
      const drawText = (text, x, y, startSize, maxWidth, minSize) => {
        let size = startSize;
        ctx.font = `bold ${size}px ${t.font}`;
        while (ctx.measureText(text).width > maxWidth && size > minSize) {
          size--;
          ctx.font = `bold ${size}px ${t.font}`;
        }
        ctx.textAlign = "center";
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.shadow.color;
        ctx.shadowBlur = t.shadow.blur;
        ctx.shadowOffsetX = t.shadow.offsetX;
        ctx.shadowOffsetY = t.shadow.offsetY;
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      };

      // ── Name ──
      const n = cfg.textSlots.name;
      const nameX = n.x === "center" ? W / 2 : n.x;
      const nameMax = n.maxWidth ?? (W - (n.maxWidthMargin || 0));
      drawText(targetName, nameX, n.y, n.startSize, nameMax, n.minSize);

      // ── Random Bounty ──
      const amounts = cfg.bounty.amounts;
      const bounty = amounts[Math.floor(Math.random() * amounts.length)];
      const bountyStr = bounty.toLocaleString("en-US") + cfg.bounty.suffix;

      const b = cfg.textSlots.bounty;
      const bountyX = b.x === "center" ? W / 2 : b.x;
      drawText(bountyStr, bountyX, b.y, b.startSize, b.maxWidth, b.minSize);

      // ── Save ──
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outPath = path.join(cacheDir, `wanted_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

      const mentionName = Object.values(mentions)[0] || targetName;
      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : ["{target}\n{bounty}"];
      const body = msgs[Math.floor(Math.random() * msgs.length)]
        .split("{target}").join(mentionName)
        .split("{bounty}").join(bountyStr);

      return message.reply({
        body,
        attachment: fs.createReadStream(outPath),
        mentions: Object.keys(mentions).length > 0
          ? [{ tag: Object.values(mentions)[0], id: targetID }]
          : [],
      });

    } catch (err) {
      console.error("Wanted error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
