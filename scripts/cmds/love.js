const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "love", version: "2.2", author: "HR ID OY", countDown: 10, role: 0, shortDescription: { en: "Create a love ship image" }, category: "Love", guide: { en: "{p}love @user" } },
  onStart: async function ({ api, event, message }) {
    const { mentions, senderID } = event;
    const mentionIDs = Object.keys(mentions);
    if (mentionIDs.length < 1) return message.reply("❌ | Please mention a user to love with.");
    const uid1 = senderID, uid2 = mentionIDs[0];
    let name1 = "You", name2 = mentions[uid2] || "User";
    try { const d = await api.getUserInfo(uid1); name1 = d[uid1].name; } catch {}
    try { const d = await api.getUserInfo(uid2); name2 = d[uid2].name; } catch {}
    const lovePercent = Math.floor(Math.random() * 91) + 10;
    const reaction = lovePercent >= 80 ? "💖 Perfect Match! 💖" : lovePercent >= 50 ? "💘 Good Match! 💘" : "💔 Needs some love... 💔";
    const config = (await axios.get(`${API_BASE}/api/links/love`)).data;
    const avatar1 = `https://graph.facebook.com/${uid1}/picture?width=512&height=512&access_token=350685531728|62f8ce9f74b12f84c123cc23437a4a32`;
    const avatar2 = `https://graph.facebook.com/${uid2}/picture?width=512&height=512&access_token=350685531728|62f8ce9f74b12f84c123cc23437a4a32`;
    const res = await axios.get(`${config.url}?user1=${encodeURIComponent(avatar1)}&user2=${encodeURIComponent(avatar2)}`, { responseType: "arraybuffer" });
    const filePath = path.join(__dirname, "cache", `ship_${uid1}_${uid2}_${Date.now()}.png`);
    await fs.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, res.data);
    message.reply({ body: `💞 Love Meter 💞\n\n${name1} ❤️ ${name2}\nLove Percentage: ${lovePercent}%\n${reaction}`, attachment: fs.createReadStream(filePath) },
      () => fs.unlinkSync(filePath));
  }
};
