const fs = require("fs-extra");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "bondhu", aliases: ["bondu"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "{pn} @mention or reply" } },
  onStart: async function ({ event, message, args }) {
    const targetID = Object.keys(event.mentions)[0] || (event.messageReply ? event.messageReply.senderID : null) || (args[0]&&/^\d+$/.test(args[0])?args[0]:null) || event.senderID;
    const ts = Date.now();
    const avtPath = __dirname + "/cache/bondhu_avt_" + ts + ".jpg";
    const outputPath = __dirname + "/cache/bondhu_out_" + ts + ".png";
    const config = (await axios.get(`${API_BASE}/api/images/bondhu`)).data;
    const [avatarRes, templateRes] = await Promise.all([
      axios.get(`https://graph.facebook.com/${targetID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }),
      axios.get(config.url, { responseType: "arraybuffer" })
    ]);
    await fs.ensureDir(__dirname + "/cache");
    fs.writeFileSync(avtPath, Buffer.from(avatarRes.data));
    const avatar = await loadImage(avtPath);
    const template = await loadImage(Buffer.from(templateRes.data));
    const canvas = createCanvas(template.width, template.height), ctx = canvas.getContext("2d");
    ctx.drawImage(template, 0, 0, template.width, template.height);
    const pos = config.positions.face;
    ctx.save(); ctx.beginPath(); ctx.rect(pos.x, pos.y, pos.w, pos.h); ctx.clip();
    const scale = Math.max(pos.w/avatar.width, pos.h/avatar.height);
    const dw = avatar.width*scale, dh = avatar.height*scale;
    ctx.drawImage(avatar, pos.x+(pos.w-dw)/2, pos.y+(pos.h-dh)/2, dw, dh);
    ctx.restore();
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    await message.reply({ attachment: fs.createReadStream(outputPath) });
    [avtPath, outputPath].forEach(p => { try { fs.unlinkSync(p); } catch {} });
  }
};
