const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";
const FB_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "chipay",
    aliases: ["corner", "muri"],
    version: "3.0.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Fun command with image and stylish caption",
    category: "Tag Fun",
    guide: { en: "{pn} @mention or reply" }
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);

    let targetID;
    if (Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];
    else if (messageReply) targetID = messageReply.senderID;
    else return api.sendMessage("🤦‍♂️ | আরে ভাই, কাকে চিপায় নিবেন তারে তো মেনশন দেন নাই!", threadID, messageID);

    const imgPath = path.join(cacheDir, `chipay_${Date.now()}.png`);

    try {
      const userInfo = await api.getUserInfo(targetID);
      const targetName = userInfo[targetID]?.name || "User";

      api.sendMessage("⏳ | একটু দাঁড়ান, চিপায় ঝালমুড়ি খাওয়ার ব্যাবস্থা করতেছি... 😋", threadID, messageID);

      // ─── API থেকে config নাও ───────────────────────────
      const cfg = await axios.get(`${API_BASE}/api/images/chipay`);
      const backgroundUrl = cfg.data?.url;
      const pos = cfg.data?.positions || {};

      const avtMentionUrl = `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=${FB_TOKEN}`;
      const avtSenderUrl  = `https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=${FB_TOKEN}`;

      const [bgImg, avtLeft, avtRight] = await Promise.all([
        loadImage(backgroundUrl),
        loadImage(avtMentionUrl),
        loadImage(avtSenderUrl)
      ]);

      const canvas = createCanvas(bgImg.width, bgImg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      ctx.font = "bold 18px Arial";
      const textWidth = ctx.measureText(targetName).width;
      const textX = canvas.width - 100;
      const textY = canvas.height - 103;
      const padding = 10;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = 28;
      const boxX = textX - boxWidth;
      const boxY = textY - 20;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "right";
      ctx.fillText(targetName, textX - padding, textY);

      const tPos = pos.target || { x: 85, y: 85, w: 110, h: 110 };
      ctx.save();
      ctx.beginPath();
      ctx.arc(tPos.x + tPos.w / 2, tPos.y + tPos.h / 2, tPos.w / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avtLeft, tPos.x, tPos.y, tPos.w, tPos.h);
      ctx.restore();

      const sPos = pos.sender || { x: 350, y: 100, w: 95, h: 95 };
      ctx.save();
      ctx.beginPath();
      ctx.arc(sPos.x + sPos.w / 2, sPos.y + sPos.h / 2, sPos.w / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avtRight, sPos.x, sPos.y, sPos.w, sPos.h);
      ctx.restore();

      fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));

      const caption = `😾⎯͢⎯⃝⋆⃝চিঁপাঁয়ঁ আঁয়ঁ ঝাঁলঁমুঁড়িঁ বাঁনাঁয়ঁছিঁ🙈 ⋆⃝⋆⃝😹😒⋆🐰🍒\n\n${targetName} এ্ঁদি্ঁকে্ঁ আ্ঁসো্ঁ 💋💋`;

      return api.sendMessage({
        body: caption,
        mentions: [{ tag: targetName, id: targetID }],
        attachment: fs.createReadStream(imgPath)
      }, threadID, () => { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); }, messageID);

    } catch (error) {
      return api.sendMessage("❌ | Error! Failed to process image.", threadID, messageID);
    }
  }
};
