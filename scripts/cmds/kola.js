const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "kola", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "kola @mention or reply" } },
  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, mentions, messageReply } = event;
    let targetID = Object.keys(mentions)[0] || messageReply?.senderID || event.senderID;
    api.setMessageReaction("⏳", messageID, () => {}, true);
    const userInfo = await api.getUserInfo(targetID);
    const userName = userInfo[targetID]?.name || "User";
    const config = (await axios.get(`${API_BASE}/api/images/kola`)).data;
    const accessToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
    const [baseImage, targetPfp] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${accessToken}`)
    ]);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    const pfpW = 130, pfpH = 170;
    const x = (canvas.width / 2) - (pfpW / 2) + 25;
    const y = (canvas.height / 2) - (pfpH / 2) - 110;
    ctx.save(); ctx.beginPath();
    ctx.ellipse(x + pfpW/2, y + pfpH/2, pfpW/2, pfpH/2, 0, 0, Math.PI*2);
    ctx.closePath(); ctx.clip(); ctx.drawImage(targetPfp, x, y, pfpW, pfpH); ctx.restore();
    ctx.beginPath(); ctx.ellipse(x + pfpW/2, y + pfpH/2, pfpW/2, pfpH/2, 0, 0, Math.PI*2);
    ctx.lineWidth = 5; ctx.strokeStyle = config.border?.color || "#ffffff"; ctx.stroke();
    const filePath = path.join(process.cwd(), "cache", `kola_${Date.now()}.png`);
    await fs.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
    api.setMessageReaction("✅", messageID, () => {}, true);
    const body = (config.messages?.[0] || "ঐ দেখ মামা! 😂\n\n🥰 নাম: {name} 🎭").replace("{name}", userName);
    return api.sendMessage({ body, mentions: [{ tag: userName, id: targetID }], attachment: fs.createReadStream(filePath) },
      threadID, () => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, messageID);
  }
};
