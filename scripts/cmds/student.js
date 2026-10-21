const axios = require("axios");
const fs = require("fs-extra");
const { loadImage, createCanvas } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "student", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Image", guide: { en: "{pn} [text]" } },
  wrapText: async (ctx, text, maxWidth) => {
    return new Promise(r => {
      if (ctx.measureText(text).width < maxWidth) return r([text]);
      const words = text.split(' '), lines = []; let line = '';
      while (words.length > 0) {
        let split = false;
        while (ctx.measureText(words[0]).width >= maxWidth) { const t = words[0]; words[0]=t.slice(0,-1); if(split) words[1]=`${t.slice(-1)}${words[1]}`; else { split=true; words.splice(1,0,t.slice(-1)); } }
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) line+=`${words.shift()} `;
        else { lines.push(line.trim()); line=''; }
        if (words.length===0) lines.push(line.trim());
      }
      r(lines);
    });
  },
  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const text = args.join(" ");
    if (!text) return api.sendMessage("Enter the content of the comment on the board", threadID, messageID);
    const config = (await axios.get(`${API_BASE}/api/images/student`)).data;
    const pathImg = __dirname + '/cache/student.png';
    await fs.ensureDir(__dirname + '/cache');
    const getImg = (await axios.get(config.url, { responseType: 'arraybuffer' })).data;
    fs.writeFileSync(pathImg, Buffer.from(getImg));
    const baseImage = await loadImage(pathImg);
    const canvas = createCanvas(baseImage.width, baseImage.height), ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    const t = config.text;
    ctx.font = t.font; ctx.rotate(t.rotateDeg * Math.PI / 180); ctx.fillStyle = t.color; ctx.textAlign = t.align;
    let fontSize = 45;
    while (ctx.measureText(text).width > 2250) { fontSize--; ctx.font = `400 ${fontSize}px Arial`; }
    const lines = await this.wrapText(ctx, text, t.maxWidth||420);
    ctx.fillText(lines.join('\n'), t.x, t.y);
    fs.writeFileSync(pathImg, canvas.toBuffer());
    return api.sendMessage({ attachment: fs.createReadStream(pathImg) }, threadID, () => fs.unlinkSync(pathImg), messageID);
  }
};
