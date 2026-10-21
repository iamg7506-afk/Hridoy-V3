const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "rajakar", version: "2.1", author: "HR ID OY", countDown: 1, role: 0, category: "Tag Fun", description: "Create a rajakar image.", guide: { en: "{pn} @mention or reply" } },
  onStart: async function ({ api, event }) {
    if (this.config.author !== "MR_FARHAÑ") return api.sendMessage("⚠️ Author name changed!", event.threadID, event.messageID);
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    let targetID = Object.keys(mentions || {})[0] || messageReply?.senderID || senderID;
    const userInfo = await api.getUserInfo(targetID);
    const userName = userInfo[targetID]?.name || "User";
    const config = (await axios.get(`${API_BASE}/api/images/rajakar`)).data;
    const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const [bgBuffer, avatarBuffer] = await Promise.all([
      axios.get(config.url, { responseType: "arraybuffer" }),
      axios.get(avatarUrl, { responseType: "arraybuffer" })
    ]);
    const bgImg = await loadImage(Buffer.from(bgBuffer.data, "binary"));
    const avatarImg = await loadImage(Buffer.from(avatarBuffer.data, "binary"));
    const canvas = createCanvas(bgImg.width, bgImg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    const sz = 120;
    const x = canvas.width - sz - 75;
    const y = (canvas.height/2) - (sz/2) - 15;
    ctx.save(); ctx.beginPath(); ctx.arc(x+sz/2, y+sz/2, sz/2, 0, Math.PI*2); ctx.closePath(); ctx.clip();
    ctx.drawImage(avatarImg, x, y, sz, sz); ctx.restore();
    const imgPath = path.join(__dirname, "cache", `rk_${targetID}.png`);
    await fs.ensureDir(path.dirname(imgPath));
    fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));
    const body = (config.messages?.[0] || "এই যে দেখেন আমাদের নতুন রাজাকার: {name}").replace("{name}", userName);
    return api.sendMessage({ body, mentions: [{ tag: userName, id: targetID }], attachment: fs.createReadStream(imgPath) },
      threadID, () => { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); }, messageID);
  }
};
