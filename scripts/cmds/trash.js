const { loadImage, createCanvas } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "trash", version: "2.1", author: "HR ID OY", shortDescription: "Trash meme বানাও", category: "Tag Fun", guide: { en: "{pn} @mention | reply" }, coolDown: 5 },
  onStart: async function ({ api, event, message }) {
    const { mentions, messageReply } = event;
    let targetID, targetName = "সে";
    if (Object.keys(mentions).length > 0) { targetID = Object.keys(mentions)[0]; targetName = Object.values(mentions)[0].replace(/@/g,"").trim() || "সে"; }
    else if (messageReply) { targetID = messageReply.senderID; try { const info = await api.getUserInfo(targetID); targetName = info[targetID]?.name || "সে"; } catch {} }
    else return message.reply("❌ কাকে trash করবা?\n👤 mention করো অথবা ↩️ reply দাও।");
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const outputPath = path.join(cacheDir, `trash_${targetID}_${Date.now()}.jpg`);
    try {
      const config = (await axios.get(`${API_BASE}/api/images/trash`, { timeout: 10000 })).data;
      const templatePath = path.join(cacheDir, "trash_template.jpg");
      if (!fs.existsSync(templatePath)) { const t = await axios.get(config.url, { responseType: "arraybuffer", timeout: 15000 }); fs.writeFileSync(templatePath, Buffer.from(t.data)); }
      const avatarURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const [template, avatarRes] = await Promise.all([loadImage(templatePath), axios.get(avatarURL, { responseType: "arraybuffer", timeout: 15000 })]);
      const avatar = await loadImage(Buffer.from(avatarRes.data));
      const canvas = createCanvas(template.width, template.height), ctx = canvas.getContext("2d");
      ctx.drawImage(template, 0, 0, template.width, template.height);
      const pos = config.positions.face;
      if (pos.border) { ctx.fillStyle = "#ffffff"; ctx.fillRect(pos.x-4, pos.y-4, pos.w+8, pos.h+8); ctx.strokeStyle = "#000000"; ctx.lineWidth = 3; ctx.strokeRect(pos.x-4, pos.y-4, pos.w+8, pos.h+8); }
      ctx.save(); ctx.beginPath(); ctx.rect(pos.x, pos.y, pos.w, pos.h); ctx.clip();
      const scale = Math.max(pos.w/avatar.width, pos.h/avatar.height);
      ctx.drawImage(avatar, pos.x+(pos.w-avatar.width*scale)/2, pos.y+(pos.h-avatar.height*scale)/2, avatar.width*scale, avatar.height*scale);
      ctx.restore();
      fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.95 }));
      const body = (config.messages?.[0] || "🗑️ {name} আর dustbin — same vibes! 😂").replace("{name}", targetName);
      await message.reply({ body, attachment: fs.createReadStream(outputPath) });
      setTimeout(() => { try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {} }, 5000);
    } catch (err) {
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
      return message.reply("❌ Trash meme বানানো যায়নি!\n🔄 আবার try করো।");
    }
  }
};
