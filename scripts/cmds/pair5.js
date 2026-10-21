const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "pair5", aliases: ["pr5"], version: "2.1", author: "HR ID OY", category: "Love" },
  onStart: async function ({ api, event, usersData }) {
    const config = (await axios.get(`${API_BASE}/api/images/pair5`)).data;
    const senderName = (await usersData.get(event.senderID)).name;
    const thread = await api.getThreadInfo(event.threadID);
    const myData = thread.userInfo.find(u => u.id===event.senderID);
    const myGender = myData?.gender;
    let candidates = myGender==="MALE" ? thread.userInfo.filter(u=>u.gender==="FEMALE"&&u.id!==event.senderID) : thread.userInfo.filter(u=>u.gender==="MALE"&&u.id!==event.senderID);
    if (!candidates.length) candidates = thread.userInfo.filter(u=>u.id!==event.senderID);
    if (!candidates.length) return api.sendMessage("❌ No match found.", event.threadID, event.messageID);
    const match = candidates[Math.floor(Math.random()*candidates.length)];
    const bgUrl = Array.isArray(config.url) ? config.url[Math.floor(Math.random()*config.url.length)] : config.url;
    const cW = config.canvasSize?.w||800, cH = config.canvasSize?.h||400;
    const canvas = createCanvas(cW, cH), ctx = canvas.getContext("2d");
    const [bg, av1, av2] = await Promise.all([loadImage(bgUrl), loadImage(`https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`), loadImage(`https://graph.facebook.com/${match.id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)]);
    ctx.drawImage(bg, 0, 0, cW, cH);
    const draw = (img, pos) => { ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2); ctx.closePath(); ctx.clip(); ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore(); };
    draw(av1, config.positions.sender); draw(av2, config.positions.target);
    const outputPath = path.join(__dirname, "cache", `pair5_${Date.now()}.png`); await fs.ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    const love = Math.floor(Math.random()*31)+70;
    const body = (config.messages?.[0]||"🥰 {sender} & {target}\n💌 Love: {love}%").replace("{sender}",senderName).replace("{target}",match.name).replace("{love}",love);
    api.sendMessage({ body, attachment: fs.createReadStream(outputPath) }, event.threadID, () => { if(fs.existsSync(outputPath)) fs.unlinkSync(outputPath); }, event.messageID);
  }
};
