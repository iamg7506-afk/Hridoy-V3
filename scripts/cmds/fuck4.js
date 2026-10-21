const fs = require("fs-extra");
const Canvas = require("canvas");
const path = require("path");
const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "fuck4", version: "2.1", author: "HR ID OY", role: 0, countDown: 5, category: "NSFW", guide: { en: "{pn} @mention | reply | uid" } },
  onStart: async function ({ api, event, message, usersData }) {
    api.setMessageReaction("🕜", event.messageID, () => {}, true);
    const sender = event.senderID;
    let target = event.messageReply?.senderID || Object.keys(event.mentions||{})[0] || event.body?.match(/\b\d{8,20}\b/)?.[0];
    if (!target) return message.reply("❌");
    const config = (await axios.get(`${API_BASE}/api/images/fuck4`)).data;
    if ((config.blockedIDs||[]).includes(target)) return message.reply("🚫");
    const [name1, name2] = await Promise.all([usersData.getName(sender).catch(()=>"You"), usersData.getName(target).catch(()=>"Friend")]);
    const TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";
    const [img1, img2, bgImg] = await Promise.all([
      Canvas.loadImage(`https://graph.facebook.com/${sender}/picture?width=512&height=512&access_token=${TOKEN}`),
      Canvas.loadImage(`https://graph.facebook.com/${target}/picture?width=512&height=512&access_token=${TOKEN}`),
      Canvas.loadImage(config.url)
    ]);
    const canvas = Canvas.createCanvas(bgImg.width, bgImg.height), ctx = canvas.getContext("2d");
    ctx.drawImage(bgImg, 0, 0);
    const draw = (img, pos) => { ctx.save(); ctx.beginPath(); ctx.arc(pos.cx, pos.cy, pos.r, 0, Math.PI*2); ctx.closePath(); ctx.clip(); ctx.drawImage(img, pos.cx-pos.r, pos.cy-pos.r, pos.r*2, pos.r*2); ctx.restore(); };
    draw(img1, config.positions.sender); draw(img2, config.positions.target);
    const file = path.join(__dirname, "tmp", `${sender}_${target}.png`);
    await fs.ensureDir(path.dirname(file));
    fs.writeFileSync(file, canvas.toBuffer());
    const body = (config.messages?.[0]||"{sender} ƒυ¢кє∂ {target} 🥵🫦").replace("{sender}",name1).replace("{target}",name2);
    message.reply({ body, attachment: fs.createReadStream(file) }, () => { fs.unlinkSync(file); api.setMessageReaction("✅", event.messageID, () => {}, true); });
  }
};
