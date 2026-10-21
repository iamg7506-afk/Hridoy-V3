const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";
const ACCESS_TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";

module.exports = {
  config: {
    name: "slap",
    version: "4.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Custom slap image with circular avatars",
    category: "Tag Fun",
    guide: "{pn} @tag or reply someone"
  },

  langs: {
    en: { noTag: "যারে থাপড়াবি ওরে মেনশন দে 😒 বা রিপ্লাই কর 😏" }
  },

  onStart: async function ({ event, message, usersData, getLang }) {
    const uid1 = event.senderID;
    let uid2 = Object.keys(event.mentions || {})[0];
    if (!uid2 && event.messageReply) uid2 = event.messageReply.senderID;
    if (!uid2) return message.reply(getLang("noTag"));

    const getFbPic = async (id) => {
      try {
        const r = await axios.get(`https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}&redirect=false`);
        return r.data.data.url;
      } catch { return null; }
    };

    const av1 = (await getFbPic(uid1)) || (await usersData.getAvatarUrl(uid1));
    const av2 = (await getFbPic(uid2)) || (await usersData.getAvatarUrl(uid2));

    // Get template config from api.json
    const cfg = await axios.get(`${API_BASE}/api/images/slap`);
    const { url: templateUrl, positions, messages } = cfg.data;

    const [template, img1, img2] = await Promise.all([loadImage(templateUrl), loadImage(av1), loadImage(av2)]);

    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(template, 0, 0);

    const drawCircleAvatar = (img, x, y, size) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();
    };

    drawCircleAvatar(img1, positions.sender.x, positions.sender.y, positions.sender.w);
    drawCircleAvatar(img2, positions.target.x, positions.target.y, positions.target.w);

    const tmpDir = path.join(__dirname, "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const filePath = path.join(tmpDir, `slap_${uid1}_${uid2}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

    message.reply({ body: messages[0], attachment: fs.createReadStream(filePath) }, () => {
      try { fs.unlinkSync(filePath); } catch {}
    });
  }
};
