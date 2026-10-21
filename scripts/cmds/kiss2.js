const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "kiss2", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Love", guide: { en: "{p}{n} @mention | Reply | uid" } },
  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;
    let mentionID = type==="message_reply" ? messageReply.senderID : Object.keys(mentions)[0] || args[0];
    if (!mentionID) return api.sendMessage("Please mention someone or reply!", threadID, messageID);
    const senderInfo = await usersData.get(senderID), mentionInfo = await usersData.get(mentionID);
    const senderName = senderInfo.name, mentionName = mentionInfo.name, senderGender = senderInfo.gender;
    const config = (await axios.get(`${API_BASE}/api/images/kiss2`)).data;
    const [bgImg, avS, avM] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`),
      loadImage(`https://graph.facebook.com/${mentionID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)
    ]);
    const canvas = createCanvas(bgImg.width, bgImg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    const pos = senderGender === 2 ? config.male : config.female;
    const draw = (img, p) => { ctx.save(); ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI*2, true); ctx.clip(); ctx.drawImage(img, p.cx-p.r, p.cy-p.r, p.r*2, p.r*2); ctx.restore(); };
    draw(avS, pos.sender); draw(avM, pos.target);
    const cachePath = path.join(__dirname, "cache", `kiss2_${Date.now()}.png`);
    await fs.ensureDir(path.dirname(cachePath)); fs.writeFileSync(cachePath, canvas.toBuffer());
    const body = (config.messages?.[0]||"{sender} kissed {target} 💋").replace("{sender}",senderName).replace("{target}",mentionName);
    return api.sendMessage({ body, attachment: fs.createReadStream(cachePath) }, threadID, () => { if(fs.existsSync(cachePath)) fs.unlinkSync(cachePath); }, messageID);
  }
};
