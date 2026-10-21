const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "rip", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: "{pn} @mention | reply | uid" },
  onStart: async function ({ api, event, args }) {
    let mentionID = event.type==="message_reply" ? event.messageReply.senderID : Object.keys(event.mentions)[0] || (args[0] && !isNaN(args[0]) ? args[0] : null);
    if (!mentionID) return api.sendMessage("Please mention a user or reply.", event.threadID, event.messageID);
    const senderID = event.senderID;
    const config = (await axios.get(`${API_BASE}/api/images/rip`)).data;
    const bgRes = await axios.get(config.url, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
    const bgImage = await loadImage(Buffer.from(bgRes.data));
    let senderName = "Someone", mentionName = "Someone";
    let senderAvatarUrl = `https://graph.facebook.com/${senderID}/picture?width=512&height=512`;
    let mentionAvatarUrl = `https://graph.facebook.com/${mentionID}/picture?width=512&height=512`;
    try { const ui = await api.getUserInfo([senderID, mentionID]); senderName = ui[senderID]?.name||"Someone"; mentionName = ui[mentionID]?.name||"Someone"; if(ui[senderID]?.thumbSrc) senderAvatarUrl=ui[senderID].thumbSrc; if(ui[mentionID]?.thumbSrc) mentionAvatarUrl=ui[mentionID].thumbSrc; } catch {}
    const get = async (url) => { try { const r = await axios.get(url, {responseType:"arraybuffer",headers:{"User-Agent":"Mozilla/5.0"}}); return Buffer.from(r.data); } catch { const r = await axios.get(`https://graph.facebook.com/${senderID}/picture?width=512&height=512`,{responseType:"arraybuffer"}); return Buffer.from(r.data); } };
    const [sB, mB] = await Promise.all([get(senderAvatarUrl), get(mentionAvatarUrl)]);
    const senderImage = await loadImage(sB), mentionImage = await loadImage(mB);
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    const pos = config.positions;
    ctx.save(); ctx.translate(pos.target.x+pos.target.w/2, pos.target.y+pos.target.h/2); ctx.rotate(-3*Math.PI/180); ctx.drawImage(mentionImage,-pos.target.w/2,-pos.target.h/2,pos.target.w,pos.target.h); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(pos.sender.x+pos.sender.w/2, pos.sender.y+pos.sender.h/2, pos.sender.w/2, 0, Math.PI*2, true); ctx.closePath(); ctx.clip(); ctx.drawImage(senderImage, pos.sender.x, pos.sender.y, pos.sender.w, pos.sender.h); ctx.restore();
    const cacheFolder = path.join(__dirname, "cache"); await fs.ensureDirSync(cacheFolder);
    const imagePath = path.join(cacheFolder, `rip_${senderID}_${Date.now()}.png`);
    fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));
    const body = (config.messages?.[0]||"R.I.P ⚰️\n{target}-এর কবরে ফুল দিচ্ছেন {sender}!").replace("{sender}",senderName).replace("{target}",mentionName);
    return api.sendMessage({ body, attachment: fs.createReadStream(imagePath) }, event.threadID, () => { if(fs.existsSync(imagePath)) fs.unlinkSync(imagePath); }, event.messageID);
  }
};
