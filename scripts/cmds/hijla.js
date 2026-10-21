const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "hijla";

module.exports = {
  config: { name: "hijla", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", description: "Funny hijla meme", guide: "{pn} @mention or reply" },
  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, mentions, messageReply } = event;
    let targetID = Object.keys(mentions)[0] || messageReply?.senderID;
    if (!targetID) return message.reply("আরে মামা, কারে হিজলা সাজাবি তারে তো মেনশন দিলি না! 💃");
    const userInfo = await api.getUserInfo(targetID);
    const userName = userInfo[targetID]?.name || "User";
    message.reply("দাঁড়া মামা, ওরে হিজলা সাজাইয়া দিচ্ছি... ⏳💄");
    const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`)).data;
    const accessToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
    const [baseImage, targetPfp] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${accessToken}`)
    ]);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    const pos = config.positions.face;
    ctx.save(); ctx.beginPath();
    // ellipse shape
    ctx.ellipse(pos.x + pos.w/2, pos.y + pos.h/2, pos.w/2, pos.h/2, 0, 0, Math.PI*2);
    ctx.closePath(); ctx.clip();
    ctx.drawImage(targetPfp, pos.x, pos.y, pos.w, pos.h);
    ctx.restore();
    const cacheDir = path.join(process.cwd(), "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `hijla_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
    const body = (config.messages?.[0] || "ঐ দেখ মামা, আমাদের নতুন হিজলা! 💃\n\nনাম: {name} 😂").replace("{name}", userName);
    return api.sendMessage({ body, mentions: [{ tag: userName, id: targetID }], attachment: fs.createReadStream(filePath) },
      threadID, () => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, messageID);
  }
};
