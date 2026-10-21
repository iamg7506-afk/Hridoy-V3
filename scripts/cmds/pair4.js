const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "pair4", aliases: ["pr4"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Love", guide: { en: "{p}pair or reply/tag" } },
  onStart: async function ({ api, event, usersData, args }) {
    let targetID = event.type==="message_reply" ? event.messageReply.senderID : Object.keys(event.mentions)[0];
    if (!targetID) { const t = await api.getThreadInfo(event.threadID); const others = t.userInfo.filter(u=>u.id!==event.senderID); if(!others.length) return api.sendMessage("❌ No other users!", event.threadID, event.messageID); targetID = others[Math.floor(Math.random()*others.length)].id; }
    const senderName = (await usersData.get(event.senderID)).name, targetName = (await usersData.get(targetID)).name;
    const config = (await axios.get(`${API_BASE}/api/images/pair4`)).data;
    const bgUrl = Array.isArray(config.url) ? config.url[Math.floor(Math.random()*config.url.length)] : config.url;
    const cW = config.canvasSize?.w||800, cH = config.canvasSize?.h||400;
    const canvas = createCanvas(cW, cH), ctx = canvas.getContext("2d");
    const [bg, av1, av2] = await Promise.all([loadImage(bgUrl), loadImage(`https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`), loadImage(`https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)]);
    ctx.drawImage(bg, 0, 0, cW, cH);
    const draw = (img, pos) => { ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2); ctx.closePath(); ctx.clip(); ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore(); };
    draw(av1, config.positions.sender); draw(av2, config.positions.target);
    const outputPath = path.join(__dirname, "cache", `pair4_${Date.now()}.png`); await fs.ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    const love = Math.floor(Math.random()*101);
    const loveMsg = love<=20?"💔 Not a good match...":love<=40?"🤔 Need more time?":love<=60?"✨ Good potential!":love<=80?"💖 Aww, so sweet!":"😍 PERFECT MATCH!";
    const body = `💘 Couple Alert 💘\n• ${senderName}\n• ${targetName}\n\n💞 Love Meter: ${love}%\n${loveMsg}\n\n🌸 Hope you two have beautiful moments!`;
    api.sendMessage({ body, attachment: fs.createReadStream(outputPath) }, event.threadID, () => { if(fs.existsSync(outputPath)) fs.unlinkSync(outputPath); }, event.messageID);
  }
};
