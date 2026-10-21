const fs = require("fs-extra");
const Canvas = require("canvas");
const path = require("path");
const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "marry", aliases: ["biya", "engage"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Propose with custom image", category: "Love", guide: "{pn} @mention" },
  onStart: async function ({ message, event, usersData }) {
    const mention = Object.keys(event.mentions);
    if (!mention.length) return message.reply("plz mention someone");
    const senderID = event.senderID, mentionedID = mention[0];
    const nameSender = await usersData.getName(senderID);
    const nameMentioned = await usersData.getName(mentionedID);
    const avatarSender = (await usersData.getAvatarUrl(senderID)) || `https://graph.facebook.com/${senderID}/picture?width=512&height=512`;
    const avatarMentioned = (await usersData.getAvatarUrl(mentionedID)) || `https://graph.facebook.com/${mentionedID}/picture?width=512&height=512`;
    const config = (await axios.get(`${API_BASE}/api/images/marry`)).data;
    const [imgSender, imgMentioned, bg] = await Promise.all([Canvas.loadImage(avatarSender), Canvas.loadImage(avatarMentioned), Canvas.loadImage(config.url)]);
    const cW = config.canvasSize?.w || 1280, cH = config.canvasSize?.h || 1280;
    const canvas = Canvas.createCanvas(cW, cH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, cW, cH);
    const sz = config.avatarSize || Math.floor(cW * 0.11);
    const drawCircle = (img, pos) => {
      ctx.save(); ctx.beginPath(); ctx.arc(pos.x + sz/2, pos.y + sz/2, sz/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(img, pos.x, pos.y, sz, sz); ctx.restore();
    };
    drawCircle(imgMentioned, config.positions.target);
    drawCircle(imgSender, config.positions.sender);
    const tmpDir = path.join(__dirname, "tmp");
    await fs.ensureDir(tmpDir);
    const imgPath = path.join(tmpDir, `${senderID}_${mentionedID}_marry.png`);
    await fs.writeFile(imgPath, canvas.toBuffer("image/png"));
    const body = senderID === mentionedID ? "নিজেকে নিজেকে বিয়ে করবে ? 😂"
      : (config.messages?.[0] || "💍 {sender} এর বিয়ে {target}- এর সাথে 🥰❤️").replace("{sender}", nameSender).replace("{target}", nameMentioned);
    await message.reply({ body, attachment: fs.createReadStream(imgPath) }, () => fs.unlink(imgPath).catch(()=>{}));
  }
};
