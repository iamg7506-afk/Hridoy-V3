const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "eww", version: "2.1", author: "HR ID OY", shortDescription: "EWW মেমে বানাও", category: "Tag Fun", guide: { en: "{pn} @mention | reply করে" }, coolDown: 5 },
  onStart: async function ({ api, event }) {
    const { threadID, messageID, mentions, messageReply } = event;
    let targetID;
    if (Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];
    else if (messageReply) targetID = messageReply.senderID;
    else return api.sendMessage("❌ কাউকে mention করো অথবা কারো message এ reply দাও।", threadID, messageID);
    let targetName;
    if (Object.keys(mentions).length > 0) targetName = Object.values(mentions)[0].replace(/@/g,"").trim();
    else { try { const info = await api.getUserInfo(targetID); targetName = info[targetID]?.name || "সে"; } catch { targetName = "সে"; } }
    const avatarURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    try {
      const config = (await axios.get(`${API_BASE}/api/images/eww`, { timeout: 10000 })).data;
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const templatePath = path.join(cacheDir, "eww_template.jpg");
      if (!fs.existsSync(templatePath)) {
        const resp = await axios.get(config.url, { responseType: "arraybuffer", timeout: 20000 });
        fs.writeFileSync(templatePath, resp.data);
      }
      const [template, avatar] = await Promise.all([loadImage(templatePath), loadImage(avatarURL)]);
      const canvas = createCanvas(template.width, template.height), ctx = canvas.getContext("2d");
      ctx.drawImage(template, 0, 0);
      const pos = config.positions.face;
      const cx = pos.x + pos.w/2, cy = pos.y + pos.h/2, rad = pos.rotateDeg ? (pos.rotateDeg * Math.PI/180) : 0;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rad); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.rect(pos.x, pos.y, pos.w, pos.h); ctx.clip();
      const scale = Math.max(pos.w/avatar.width, pos.h/avatar.height);
      const dw = avatar.width*scale, dh = avatar.height*scale;
      const dx = pos.x + (pos.w-dw)/2, dy = pos.y + (pos.h-dh)/2;
      ctx.drawImage(avatar, dx, dy, dw, dh); ctx.restore();
      const outputPath = path.join(cacheDir, `eww_${targetID}.png`);
      fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
      const body = (config.messages?.[0] || "🤢 EWW! {name} কে দেখে Patrick ও বিরক্ত! 😂").replace("{name}", targetName);
      await api.sendMessage({ body, attachment: fs.createReadStream(outputPath) }, threadID, () => { try { fs.unlinkSync(outputPath); } catch {} }, messageID);
    } catch (err) {
      return api.sendMessage(`❌ মেমে বানাতে সমস্যা!\nError: ${err.message}`, threadID, messageID);
    }
  }
};
