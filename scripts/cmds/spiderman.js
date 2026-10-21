const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "spiderman",
    version: "2.3",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Spiderman pointing meme",
    category: "Tag Fun",
    guide: "{pn} @mention or reply",
    coolDown: 5,
  },

  onStart: async function ({ message, event }) {
    try {
      const mention = Object.keys(event.mentions || {});
      let user1, user2;

      if (mention.length === 0) {
        if (event.type === "message_reply") {
          user1 = event.senderID;
          user2 = event.messageReply.senderID;
        } else {
          return message.reply("❌ কাউকে tag করো অথবা কারো message এ reply দাও।");
        }
      } else if (mention.length === 1) {
        user1 = event.senderID;
        user2 = mention[0];
      } else {
        user1 = mention[0];
        user2 = mention[1];
      }

      // ─── API থেকে config নাও ───────────────────────────────────
      const { data: config } = await axios.get(
        `${API_BASE}/api/images/spiderman`,
        { timeout: 10000 }
      );

      // ─── Avatar fetch ──────────────────────────────────────────
      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const getAvatar = async (id) => {
        const res = await axios.get(
          `https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=${token}`,
          { responseType: "arraybuffer", timeout: 10000 }
        );
        return loadImage(Buffer.from(res.data));
      };

      const bgRes = await axios.get(config.url, { responseType: "arraybuffer", timeout: 15000 });

      const [av1, av2, bg] = await Promise.all([
        getAvatar(user1),
        getAvatar(user2),
        loadImage(Buffer.from(bgRes.data)),
      ]);

      // ─── Canvas ────────────────────────────────────────────────
      const cW = config.canvasSize.w;
      const cH = config.canvasSize.h;
      const canvas = createCanvas(cW, cH);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, cW, cH);

      const drawCircle = (img, pos) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x + pos.w / 2, pos.y + pos.h / 2, pos.w / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h);
        ctx.restore();
      };

      drawCircle(av1, config.positions.sender);
      drawCircle(av2, config.positions.target);

      // ─── Output ────────────────────────────────────────────────
      const cacheDir = path.join(__dirname, "..", "tmp");
      await fs.ensureDir(cacheDir);
      const out = path.join(cacheDir, `spiderman_${Date.now()}.png`);
      fs.writeFileSync(out, canvas.toBuffer("image/png"));

      const msgs = config.messages;
      const body = msgs?.[Math.floor(Math.random() * msgs.length)] || "🕷️ Same same! 😂";

      return message.reply(
        { body, attachment: fs.createReadStream(out) },
        () => { try { fs.unlinkSync(out); } catch {} }
      );

    } catch (err) {
      console.error("[SPIDERMAN ERROR]", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
