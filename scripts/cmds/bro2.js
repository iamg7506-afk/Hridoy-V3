const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "bro2", aliases: ["minebro","bleachbro"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "{pn} @tag or reply" } },
  onStart: async function ({ event, message, usersData }) {
    const senderID = event.senderID;
    let targetID = Object.keys(event.mentions||{})[0] || event.messageReply?.senderID;
    if (!targetID) return message.reply("Please tag a user or reply 💎");
    const [senderName, targetName] = await Promise.all([usersData.getName(senderID).catch(()=>"Bro1"), usersData.getName(targetID).catch(()=>"Bro2")]);
    const [senderAvatarUrl, targetAvatarUrl] = await Promise.all([usersData.getAvatarUrl(senderID), usersData.getAvatarUrl(targetID)]);
    const config = (await axios.get(`${API_BASE}/api/images/bro2`)).data;
    const [sAv, tAv, baseImage] = await Promise.all([loadImage(senderAvatarUrl), loadImage(targetAvatarUrl), loadImage(config.url)]);
    const canvas = createCanvas(baseImage.width, baseImage.height), ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    const draw = (av, pos) => { ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2); ctx.closePath(); ctx.clip(); ctx.drawImage(av, pos.x, pos.y, pos.w, pos.h); ctx.restore(); };
    draw(sAv, config.positions.sender); draw(tAv, config.positions.target);
    const tmpDir = path.join(__dirname, "tmp"); await fs.ensureDir(tmpDir);
    const imgPath = path.join(tmpDir, `bro2_${Date.now()}.png`);
    await fs.writeFile(imgPath, canvas.toBuffer("image/png"));
    const body = (config.messages?.[0]||"💎 {sender} and {target} are mining through life together!").replace("{sender}",senderName).replace("{target}",targetName);
    await message.reply({ body, attachment: fs.createReadStream(imgPath) });
    setTimeout(() => { if(fs.existsSync(imgPath)) fs.unlinkSync(imgPath); }, 10000);
  }
};
