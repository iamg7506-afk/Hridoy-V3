const axios = require("axios");
const fs = require("fs-extra");
const { loadImage, createCanvas } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "mia", aliases: ["mia khalifa"], author: "HR ID OY", countDown: 5, role: 0, category: "Image", version: "1.0" },
  wrapText: async (ctx, text, maxWidth) => {
    return new Promise((resolve) => {
      if (ctx.measureText(text).width < maxWidth) return resolve([text]);
      const words = text.split(" "); const lines = []; let line = "";
      while (words.length > 0) {
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) { line += `${words.shift()} `; }
        else { lines.push(line.trim()); line = ""; }
        if (words.length === 0) lines.push(line.trim());
      }
      resolve(lines);
    });
  },
  onStart: async function ({ api, event, args }) {
    const text = args.join(" ");
    if (!text) return api.sendMessage("Enter text!", event.threadID, event.messageID);
    const config = (await axios.get(`${API_BASE}/api/images/mia`)).data;
    const pathImg = __dirname + "/cache/mia.png";
    await fs.ensureDir(__dirname + "/cache");
    const res = await axios.get(config.url, { responseType: "arraybuffer" });
    fs.writeFileSync(pathImg, Buffer.from(res.data));
    const baseImage = await loadImage(pathImg);
    const canvasImg = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvasImg.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvasImg.width, canvasImg.height);
    const t = config.text || { font: "300 32px Arial", color: "#000000", align: "start", x: 50, y: 160, maxWidth: 600 };
    ctx.font = t.font; ctx.fillStyle = t.color; ctx.textAlign = t.align;
    const lines = await this.wrapText(ctx, text, t.maxWidth);
    ctx.fillText(lines.join("\n"), t.x, t.y);
    fs.writeFileSync(pathImg, canvasImg.toBuffer());
    return api.sendMessage({ attachment: fs.createReadStream(pathImg) }, event.threadID, () => fs.unlinkSync(pathImg), event.messageID);
  }
};
