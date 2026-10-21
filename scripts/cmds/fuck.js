const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "fuck";

module.exports = {
  config: {
    name: "fuck", aliases: ["fck"], version: "2.1", author: "HR ID OY",
    countDown: 5, role: 0, description: "NSFW fun meme", category: "NSFW"
  },
  onStart: async function ({ message, event }) {
    const mention = Object.keys(event.mentions);
    if (!mention.length) return message.reply("⚠️ Please mention 1 person!");
    const one = event.senderID, two = mention[0];
    const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`)).data;
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    const [bg, av1, av2] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=${token}`),
      loadImage(`https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=${token}`)
    ]);
    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, bg.width, bg.height);
    const draw = (img, pos) => {
      ctx.save(); ctx.beginPath();
      ctx.arc(pos.x + pos.w/2, pos.y + pos.h/2, pos.w/2, 0, Math.PI*2, true);
      ctx.closePath(); ctx.clip(); ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore();
    };
    draw(av1, config.positions.sender);
    draw(av2, config.positions.target);
    const dir = path.join(__dirname, "cache");
    await fs.ensureDir(dir);
    const outPath = path.join(dir, `fuck_${one}_${two}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    await message.reply({ body: config.messages?.[0] || "💥 Here you go!", attachment: fs.createReadStream(outPath) });
    fs.unlinkSync(outPath);
  }
};
