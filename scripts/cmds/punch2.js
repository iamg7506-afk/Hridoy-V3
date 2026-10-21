const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const ACCESS_TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "punch2",
    version: "4.0",
    author: "HR ID OY",
    countDown: 6,
    role: 0,
    shortDescription: "Punch a user with circular avatars",
    longDescription: "Generate a punch image (Saitama vs Goku) featuring circular avatars of the sender and the victim.",
    category: "Tag Fun",
    guide: "{pn} @tag or reply to a message"
  },

  onStart: async function ({ event, message }) {
    const uid1 = event.senderID;
    let uid2;

    if (event.messageReply) {
      uid2 = event.messageReply.senderID;
    } else {
      const mentions = Object.keys(event.mentions || {});
      uid2 = mentions[0];
    }

    if (!uid2) return message.reply("Please mention a user or reply to a message to punch! 👊");

    async function getFbProfilePic(userId) {
      const url = `https://graph.facebook.com/${userId}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}&redirect=false`;
      try {
        const res = await axios.get(url);
        return res.data.data.url;
      } catch {
        return `https://graph.facebook.com/${userId}/picture?width=512&height=512`;
      }
    }

    try {
      // Fetch template + both overlay boxes + caption from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/punch2`);

      const [template, img1, img2] = await Promise.all([
        loadImage(cfg.url),
        getFbProfilePic(uid1).then(loadImage),
        getFbProfilePic(uid2).then(loadImage),
      ]);

      const canvas = createCanvas(template.width, template.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

      function drawCircleAvatar(ctx, img, x, y, size) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
      }

      const s = cfg.overlay_sender;
      const t = cfg.overlay_target;
      drawCircleAvatar(ctx, img1, s.x, s.y, s.size);
      drawCircleAvatar(ctx, img2, t.x, t.y, t.size);

      const tmpDir = path.join(__dirname, "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

      const filePath = path.join(tmpDir, `punch_${uid1}_${uid2}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : ["👊💥 ONE PUNCH!!!"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)];

      return message.reply({
        body: caption,
        attachment: fs.createReadStream(filePath)
      }, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

    } catch (error) {
      console.error(error);
      return message.reply("⚠️ Failed to generate image. Please try again later.");
    }
  }
};
