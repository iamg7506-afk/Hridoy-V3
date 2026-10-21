const fs = require("fs-extra");
const Canvas = require("canvas");
const path = require("path");
const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";
const ACCESS_TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";
const COST = 1000;

module.exports = {
  config: {
    name: "squeeze2",
    version: "11.1",
    author: "HR ID OY",
    role: 0,
    countDown: 10,
    shortDescription: "Squeeze image effect (costs 1000 balance)",
    category: "NSFW",
    guide: "{pn} @mention or reply"
  },

  onStart: async function ({ api, event, message, usersData }) {
    api.setMessageReaction("🕜", event.messageID, () => {}, true);

    const senderID = event.senderID;
    const userData = await usersData.get(senderID);
    const balance = userData?.money || 0;

    if (balance < COST) return message.reply(`❌ | You need ${COST} balance to use this command.`);

    let targetID = null;
    if (event.messageReply?.senderID) targetID = event.messageReply.senderID;
    else if (Object.keys(event.mentions || {}).length > 0) targetID = Object.keys(event.mentions)[0];
    else {
      const match = event.body?.match(/\b\d{8,20}\b/);
      if (match) targetID = match[0];
    }
    if (!targetID) return;

    await usersData.set(senderID, { money: balance - COST });

    try {
      const [senderName, targetName] = await Promise.all([
        usersData.getName(senderID).catch(() => "You"),
        usersData.getName(targetID).catch(() => "Friend")
      ]);

      // Get bg config from api.json
      const cfg = await axios.get(`${API_BASE}/api/images/squeeze_bg`);
      const { url: bgUrl, positions, canvasSize, messages } = cfg.data;

      const senderAvatar = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}`;
      const targetAvatar = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}`;

      const [sImg, tImg, bgImg] = await Promise.all([
        Canvas.loadImage(senderAvatar),
        Canvas.loadImage(targetAvatar),
        (async () => {
          const r = await axios.get(bgUrl, { responseType: "arraybuffer" });
          return Canvas.loadImage(Buffer.from(r.data));
        })()
      ]);

      const canvas = Canvas.createCanvas(canvasSize.w, canvasSize.h);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      const drawAvatar = (img, pos) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, pos.r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, pos.cx - pos.r, pos.cy - pos.r, pos.r * 2, pos.r * 2);
        ctx.restore();
      };

      drawAvatar(sImg, positions.sender);
      drawAvatar(tImg, positions.target);

      const imgPath = path.join(__dirname, "tmp", `${senderID}_${targetID}.png`);
      await fs.ensureDir(path.dirname(imgPath));
      fs.writeFileSync(imgPath, canvas.toBuffer());

      const body = messages[0].replace("{sender}", senderName).replace("{target}", targetName) + ` 💸 -${COST} balance deducted`;

      message.reply({ body, attachment: fs.createReadStream(imgPath) }, () => {
        fs.unlinkSync(imgPath);
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      });

    } catch (err) {
      console.error(err);
    }
  }
};
