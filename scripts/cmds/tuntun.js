const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "tuntun",
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    description: {
      en: "Put target's profile picture on the tuntun meme"
    },
    category: "Tag Fun",
    guide: {
      en: "{pn} @mention | reply to a message | {pn} <uid> | {pn} (nijer pic)"
    }
  },

  onStart: async function ({ event, message, args, usersData }) {
    // Target ber kora: reply > mention > uid > nijer
    let uid;
    if (event.messageReply) uid = event.messageReply.senderID;
    else if (Object.keys(event.mentions || {}).length > 0) uid = Object.keys(event.mentions)[0];
    else if (args[0] && /^\d{5,}$/.test(args[0])) uid = args[0];
    else uid = event.senderID;

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const outPath = path.join(cacheDir, `tuntun_${uid}_${Date.now()}.png`);

    try {
      // Template url + emoji position + border + captions from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/tuntun`);

      const tplRes = await axios.get(cfg.url, { responseType: "arraybuffer" });
      const template = await loadImage(Buffer.from(tplRes.data));

      const avatarUrl = await usersData.getAvatarUrl(uid);
      const avRes = await axios.get(avatarUrl, { responseType: "arraybuffer" });
      const avatar = await loadImage(Buffer.from(avRes.data));

      const W = template.width;
      const H = template.height;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(template, 0, 0, W, H);

      const p = cfg.positions.target;
      const cx = W * p.cx_pct;
      const cy = H * p.cy_pct;
      const r = W * p.r_pct * (p.scale || 1);

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

      await fs.writeFile(outPath, canvas.toBuffer("image/png"));

      const name = await usersData.getName(uid);
      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : ["{target}"];
      const body = msgs[Math.floor(Math.random() * msgs.length)].split("{target}").join(name);

      await message.reply({
        body,
        mentions: [{ tag: name, id: uid }],
        attachment: fs.createReadStream(outPath)
      });
    } catch (err) {
      console.error("[tuntun]", err);
      message.reply("❌ Image banate somossa hoise, abar try koro.");
    } finally {
      fs.remove(outPath).catch(() => {});
    }
  }
};
