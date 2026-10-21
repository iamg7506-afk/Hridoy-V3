const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "propose", version: "2.1", author: "HR ID OY", countDown: 10, role: 0, description: "Propose someone", category: "Love", guide: { en: "{p}{n} @mention | Reply" } },
  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;
    let mentionID = type === "message_reply" ? messageReply.senderID : Object.keys(mentions)[0] || args[0];
    if (!mentionID) return api.sendMessage("Please mention someone! 💍", threadID, messageID);
    const [senderInfo, mentionInfo] = await Promise.all([usersData.get(senderID), usersData.get(mentionID)]);
    const { name: sName, gender: sGender } = senderInfo;
    const { name: mName } = mentionInfo;
    const config = (await axios.get(`${API_BASE}/api/images/propose`)).data;
    const variant = sGender === 1 ? config.male : config.female;
    const getAvatar = id => `https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const [bgImg, avatarS, avatarM] = await Promise.all([loadImage(variant.url), loadImage(getAvatar(senderID)), loadImage(getAvatar(mentionID))]);
    const canvas = createCanvas(bgImg.width, bgImg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    const draw = (img, p) => {
      ctx.save(); ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(img, p.cx-p.r, p.cy-p.r, p.r*2, p.r*2); ctx.restore();
    };
    draw(avatarS, variant.positions.sender); draw(avatarM, variant.positions.target);
    const cachePath = path.join(__dirname, "cache", `propose_${Date.now()}.png`);
    await fs.ensureDir(path.dirname(cachePath));
    fs.writeFileSync(cachePath, canvas.toBuffer());
    const body = (config.messages?.[0] || "{sender} is proposing to {target}! ❤💍").replace("{sender}", sName).replace("{target}", mName);
    return api.sendMessage({ body, attachment: fs.createReadStream(cachePath) }, threadID, () => fs.unlinkSync(cachePath), messageID);
  }
};
