const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "cow", aliases: ["cows"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "{pn} @mention / reply" } },
  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, type, messageReply, senderID } = event;
    api.setMessageReaction("⏳", messageID, () => {}, true);
    let targetID = type==="message_reply" ? messageReply.senderID : Object.keys(mentions)[0] || (args[0]&&!isNaN(args[0])?args[0]:senderID);
    const config = (await axios.get(`${API_BASE}/api/images/cow`)).data;
    const userInfo = await api.getUserInfo(targetID), name = userInfo[targetID].name;
    const [cowImg, avatarImg] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)
    ]);
    const canvas = createCanvas(cowImg.width, cowImg.height), ctx = canvas.getContext("2d");
    ctx.drawImage(cowImg, 0, 0, canvas.width, canvas.height);
    const pos = config.positions.face;
    ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2, true); ctx.closePath(); ctx.clip(); ctx.drawImage(avatarImg, pos.x, pos.y, pos.w, pos.h); ctx.restore();
    const pathImg = path.join(__dirname, "cache", `cow_${targetID}.png`); await fs.ensureDir(path.dirname(pathImg));
    fs.writeFileSync(pathImg, canvas.toBuffer());
    api.setMessageReaction("✅", messageID, () => {}, true);
    const body = (config.messages?.[0]||"{name}, your true form 🐄").replace("{name}",name);
    return api.sendMessage({ body, attachment: fs.createReadStream(pathImg) }, threadID, () => { if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg); }, messageID);
  }
};
