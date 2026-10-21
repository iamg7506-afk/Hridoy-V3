const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const jimp = require("jimp");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "married", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Love", guide: { en: "{pn} [@mention]" } },
  onLoad: async function () {
    const dirMaterial = __dirname + `/cache/canvas/`;
    const filePath = path.resolve(__dirname, 'cache/canvas', 'married.png');
    if (!fs.existsSync(dirMaterial)) fs.mkdirSync(dirMaterial, { recursive: true });
    if (!fs.existsSync(filePath)) {
      const config = (await axios.get(`${API_BASE}/api/images/married`)).data;
      const res = await axios.get(config.url, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, Buffer.from(res.data));
    }
  },
  onStart: async function ({ event, api }) {
    const { threadID, messageID, senderID } = event;
    const mention = Object.keys(event.mentions);
    if (!mention[0]) return api.sendMessage("Please mention 1 person.", threadID, messageID);
    const one = senderID, two = mention[0];
    const __root = path.resolve(__dirname, "cache", "canvas");
    let bg = await jimp.read(__root + "/married.png");
    const config = (await axios.get(`${API_BASE}/api/images/married`)).data;
    const pos = config.positions;
    const circle = async (url) => { const av = await jimp.read((await axios.get(url,{responseType:'arraybuffer'})).data); av.circle(); return await av.getBufferAsync("image/png"); };
    const [c1, c2] = await Promise.all([circle(`https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`), circle(`https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)]);
    const ci1 = await jimp.read(c1), ci2 = await jimp.read(c2);
    bg.composite(ci1.resize(pos.sender.w, pos.sender.h), pos.sender.x, pos.sender.y).composite(ci2.resize(pos.target.w, pos.target.h), pos.target.x, pos.target.y);
    const outPath = __root + `/married_${one}_${two}.png`;
    fs.writeFileSync(outPath, await bg.getBufferAsync("image/png"));
    api.sendMessage({ body: config.messages?.[0]||"💍 Married! 🥰", attachment: fs.createReadStream(outPath) }, threadID, () => fs.unlinkSync(outPath), messageID);
  }
};
