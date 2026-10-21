const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "bed";

module.exports = {
  config: {
    name: "bed", version: "2.1", author: "HR ID OY",
    countDown: 5, role: 0,
    shortDescription: "Cuddle someone in bed 🛏️",
    category: "Love", guide: { en: "{pn} @tag" }
  },
  onStart: async function ({ api, event, args, message }) {
    const { senderID, mentions } = event;
    let targetID = Object.keys(mentions)[0] || (args[0] && !isNaN(args[0]) ? args[0] : null);
    if (!targetID) return message.reply("❌ Tag someone!\nUsage: .bed @user");

    const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`)).data;
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

    const [bg, senderAv, targetAv] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=${token}`),
      loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${token}`)
    ]);

    const W = bg.width, H = bg.height;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, W, H);

    // percentage-based positions
    const pos = config.positions;
    const draw = (img, p) => {
      const cx = W * p.cxPct, cy = H * p.cyPct, r = W * p.rPct;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath(); ctx.clip(); ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2); ctx.restore();
    };
    draw(senderAv, pos.sender);
    draw(targetAv, pos.target);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const outPath = path.join(cacheDir, `bed_${Date.now()}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

    const senderName = await new Promise(r => api.getUserInfo(senderID, (e, d) => r(e ? "You" : d[senderID]?.name || "You")));
    const targetName = Object.values(mentions)[0] || "someone";
    const captions = config.captions || [];
    const caption = captions.length
      ? captions[Math.floor(Math.random() * captions.length)].replace("{sender}", senderName).replace("{target}", targetName)
      : `🛏️ ${senderName} and ${targetName} 💕`;

    return message.reply({ body: caption, attachment: fs.createReadStream(outPath) });
  }
};
