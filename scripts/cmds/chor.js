const axios = require("axios");
const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "chor", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "{pn}" } },
  onStart: async function ({ event, api }) {
    const id = Object.keys(event.mentions)[0] || event.senderID;
    const config = (await axios.get(`${API_BASE}/api/images/chor`)).data;
    const cW = config.canvasSize?.w||500, cH = config.canvasSize?.h||670;
    const canvas = createCanvas(cW, cH), ctx = canvas.getContext('2d');
    const [background, avatarRes] = await Promise.all([
      loadImage(config.url),
      axios.get(`https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: 'arraybuffer' })
    ]);
    ctx.drawImage(background, 0, 0, cW, cH);
    const avatar = await loadImage(avatarRes.data);
    const pos = config.positions.face;
    ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2); ctx.clip(); ctx.drawImage(avatar, pos.x, pos.y, pos.w, pos.h); ctx.restore();
    const pathImg = __dirname + '/cache/chor.jpg'; await fs.ensureDir(__dirname+'/cache');
    fs.writeFileSync(pathImg, canvas.toBuffer());
    const body = config.messages?.[0] || "মুরগির দুধ চুরি করতে গিয়া ধরা থাইসে_ 🐸👻";
    api.sendMessage({ body, attachment: fs.createReadStream(pathImg) }, event.threadID, () => fs.unlinkSync(pathImg), event.messageID);
  }
};
