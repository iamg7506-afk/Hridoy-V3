const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const Jimp = require("jimp");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "poop", version: "2.2", author: "HR ID OY", category: "Tag Fun", guide: { en: "{p}poop @tag" } },
  onStart: async function ({ event, args, message }) {
    let targetID, targetName;
    if (event.mentions && Object.keys(event.mentions).length > 0) { targetID = Object.keys(event.mentions)[0]; targetName = Object.values(event.mentions)[0]; }
    else return message.reply("Tag karo kake poop korbe!\nExample: /poop @name");
    const cacheDir = path.join(__dirname, "cache"); await fs.ensureDir(cacheDir);
    const config = (await axios.get(`${API_BASE}/api/images/poop`)).data;
    const templatePath = path.join(cacheDir, "poop_template.jpg");
    if (!await fs.pathExists(templatePath)) { const t = await axios({ url: config.url, responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } }); await fs.writeFile(templatePath, t.data); }
    const avatarURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const avatarPath = path.join(cacheDir, `avt_${targetID}.jpg`);
    const a = await axios({ url: avatarURL, responseType: "arraybuffer" }); await fs.writeFile(avatarPath, a.data);
    const template = await Jimp.read(templatePath);
    const W = template.getWidth(), H = template.getHeight();
    const shift = 38, boxX = Math.floor(W/2)+5+shift, boxY = Math.floor(H*2/3)+5, boxW = Math.floor(W/2)-10-shift, boxH = Math.floor(H/3)-10;
    const profileImg = await Jimp.read(avatarPath);
    profileImg.cover(boxW, boxH);
    template.composite(profileImg, boxX, boxY);
    const outPath = path.join(cacheDir, `poop_out_${Date.now()}.jpg`);
    await template.quality(92).writeAsync(outPath);
    const body = (config.messages?.[0]||"💩 {name} — 1080p quality!").replace("{name}",targetName);
    await message.reply({ body, attachment: fs.createReadStream(outPath) });
    setTimeout(() => { fs.remove(avatarPath).catch(()=>{}); fs.remove(outPath).catch(()=>{}); }, 5000);
  }
};
