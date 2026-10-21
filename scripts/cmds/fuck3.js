const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "fuck3";
const TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";

module.exports = {
  config: {
    name: "fuck3", version: "2.1", author: "HR ID OY", role: 0, countDown: 5,
    shortDescription: "NSFW fuck meme v3", category: "NSFW", guide: { en: "{pn} @mention | reply" }
  },
  onStart: async function ({ api, event, message, usersData }) {
    api.setMessageReaction("🕜", event.messageID, () => {}, true);
    const sender = event.senderID;
    let target = event.messageReply?.senderID || Object.keys(event.mentions || {})[0];
    if (!target) { const m = event.body?.match(/\b\d{8,20}\b/); if (m) target = m[0]; }
    if (!target) return message.reply("❌ মেনশন বা রিপ্লাই দাও");
    const name1 = await usersData.getName(sender).catch(() => "You");
    const name2 = await usersData.getName(target).catch(() => "Friend");
    const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`)).data;
    const [img1, img2, bgImg] = await Promise.all([
      loadImage(`https://graph.facebook.com/${sender}/picture?width=512&height=512&access_token=${TOKEN}`),
      loadImage(`https://graph.facebook.com/${target}/picture?width=512&height=512&access_token=${TOKEN}`),
      loadImage(config.url)
    ]);
    const canvas = createCanvas(bgImg.width, bgImg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bgImg, 0, 0);
    const pos = config.positions;
    const draw = (img, p) => {
      const r = p.r || p.w/2;
      const cx = p.cx !== undefined ? p.cx : p.x + r;
      const cy = p.cy !== undefined ? p.cy : p.y + r;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.closePath(); ctx.clip(); ctx.drawImage(img, cx-r, cy-r, r*2, r*2); ctx.restore();
    };
    draw(img1, pos.sender); draw(img2, pos.target);
    const filePath = path.join(__dirname, "tmp", `${sender}_${target}.png`);
    await fs.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, canvas.toBuffer());
    const body = (config.messages?.[0] || "{sender} fucked {target} 🥵🫦").replace("{sender}", name1).replace("{target}", name2);
    message.reply({ body, attachment: fs.createReadStream(filePath) }, () => {
      fs.unlinkSync(filePath); api.setMessageReaction("✅", event.messageID, () => {}, true);
    });
  }
};
