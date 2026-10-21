const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "dim";

module.exports = {
  config: {
    name: "dim", aliases: ["anda"], version: "2.1", author: "HR ID OY",
    role: 0, category: "Tag Fun", shortDescription: "Dim meme", guide: "{pn} @mention / reply"
  },
  onStart: async function ({ event, api, message }) {
    const targetID = Object.keys(event.mentions || {})[0] || event.messageReply?.senderID;
    if (!targetID) return message.reply("🔹 কাউকে mention বা reply দাও!");
    if (targetID === event.senderID) return message.reply("😂 নিজেকে dim বানানো নিষেধ!");
    await message.reply("⏳ Dim বানানো হচ্ছে...");
    const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`)).data;
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    const avatarRes = await axios.get(
      `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=${token}`,
      { responseType: "arraybuffer" });
    const [bg, avatar] = await Promise.all([loadImage(config.url), loadImage(Buffer.from(avatarRes.data))]);
    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0);
    const pos = config.positions.face;
    const cx = pos.x + pos.w/2, cy = pos.y + pos.h/2, r = pos.w/2;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.closePath(); ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 10;
    ctx.clip(); ctx.drawImage(avatar, pos.x, pos.y, pos.w, pos.h); ctx.restore();
    if (config.border) {
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI*2);
      ctx.strokeStyle = config.border.color; ctx.lineWidth = config.border.width; ctx.stroke();
    }
    ctx.font = "bold 28px Arial"; ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 4;
    const textContent = config.text?.content || "PURE DIM 😂";
    const textY = bg.height + (config.text?.offsetY || -40);
    ctx.strokeText(textContent, bg.width/2, textY); ctx.fillText(textContent, bg.width/2, textY);
    const cacheDir = path.join(__dirname, "cache", "dim");
    await fs.ensureDir(cacheDir);
    const output = path.join(cacheDir, `${targetID}_${Date.now()}.png`);
    await fs.writeFile(output, canvas.toBuffer());
    const info = await api.getUserInfo(targetID);
    const name = info[targetID]?.name || "Someone";
    const body = (config.messages?.[0] || "{target} এখন একদম DIM LEVEL MAX! 🥚🤣").replace("{target}", name);
    await message.reply({ body, mentions: [{ tag: name, id: targetID }], attachment: fs.createReadStream(output) });
    setTimeout(() => fs.unlink(output).catch(() => {}), 5000);
  }
};
