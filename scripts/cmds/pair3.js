const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "pair3", aliases: ["pr3"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Love", guide: { en: "{pn} [reply/@mention]" } },
  onStart: async function ({ api, event, usersData }) {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    let targetID, targetName;
    if (event.type==="message_reply") targetID = event.messageReply.senderID;
    else if (Object.keys(event.mentions).length) targetID = Object.keys(event.mentions)[0];
    else {
      const thread = await api.getThreadInfo(event.threadID);
      const me = thread.userInfo.find(u=>u.id==event.senderID);
      const myGender = me?.gender===2||me?.gender==="FEMALE" ? "FEMALE" : "MALE";
      const members = thread.userInfo.filter(u => u.id!=event.senderID && (myGender==="MALE" ? u.gender===2||u.gender==="FEMALE" : u.gender===1||u.gender==="MALE"));
      if (!members.length) return api.sendMessage("❌ No suitable partner found.", event.threadID, event.messageID);
      const random = members[Math.floor(Math.random()*members.length)];
      targetID = random.id; targetName = random.name;
    }
    const sender = await usersData.get(event.senderID); const senderName = sender.name;
    if (!targetName) { const t = await usersData.get(targetID); targetName = t.name; }
    const config = (await axios.get(`${API_BASE}/api/images/pair3`)).data;
    const bgUrl = Array.isArray(config.url) ? config.url[Math.floor(Math.random()*config.url.length)] : config.url;
    const cW = config.canvasSize?.w||1536, cH = config.canvasSize?.h||791;
    const canvas = createCanvas(cW, cH), ctx = canvas.getContext("2d");
    const thread = await api.getThreadInfo(event.threadID);
    const me = thread.userInfo.find(u=>u.id==event.senderID);
    const myGender = me?.gender===2||me?.gender==="FEMALE" ? "FEMALE" : "MALE";
    const senderAv = `https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const targetAv = `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const [bg, leftAv, rightAv] = await Promise.all([loadImage(bgUrl), loadImage(myGender==="MALE"?senderAv:targetAv), loadImage(myGender==="MALE"?targetAv:senderAv)]);
    ctx.drawImage(bg, 0, 0, cW, cH);
    const draw = (img, pos) => { ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2); ctx.closePath(); ctx.clip(); ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore(); };
    draw(leftAv, config.positions.left); draw(rightAv, config.positions.right);
    const love = Math.floor(Math.random()*101);
    ctx.fillStyle="#FFD700"; ctx.textAlign="center"; ctx.font="bold 60px Arial";
    (config.loveTextPos||[]).forEach(p => ctx.fillText(`${love}%`, p.x, p.y));
    const output = path.join(__dirname, "cache", `pair3_${Date.now()}.png`); await fs.ensureDir(path.dirname(output));
    fs.writeFileSync(output, canvas.toBuffer("image/png"));
    api.setMessageReaction("🎀", event.messageID, () => {}, true);
    api.sendMessage({ body: `💞 ${senderName} & ${targetName}\n💘 Love Meter: ${love}%`, attachment: fs.createReadStream(output) }, event.threadID, () => { if(fs.existsSync(output)) fs.unlinkSync(output); }, event.messageID);
  }
};
