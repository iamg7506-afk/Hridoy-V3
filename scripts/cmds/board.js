const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "board", version: "2.1", author: "HR ID OY", shortDescription: "Tom এর board এ text লেখো", category: "Tag Fun", guide: { en: "{pn} <text>" }, coolDown: 5 },
  onStart: async function ({ message, args }) {
    const text = args.join(" ").trim();
    if (!text) return message.reply("❌ কী লিখবা বলো!\nExample: !board আমি সেরা 😎");
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const outputPath = path.join(cacheDir, `board_${Date.now()}.png`);
    try {
      const config = (await axios.get(`${API_BASE}/api/images/board`, { timeout: 10000 })).data;
      const templatePath = path.join(cacheDir, "board_template.jpg");
      if (!fs.existsSync(templatePath)) { const r = await axios.get(config.url, { responseType: "arraybuffer", timeout: 15000 }); fs.writeFileSync(templatePath, r.data); }
      const template = await loadImage(templatePath);
      const canvas = createCanvas(template.width, template.height), ctx = canvas.getContext("2d");
      ctx.drawImage(template, 0, 0);
      const ta = config.textArea;
      const maxW = ta.w - ta.padding*2, maxH = ta.h - ta.padding*2;
      const wrapText = (ctx, text, maxWidth) => {
        const words = text.split(" "), lines = []; let cur = "";
        for (const word of words) { const test = cur ? cur+" "+word : word; if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = word; } else cur = test; }
        if (cur) lines.push(cur); return lines;
      };
      let fontSize = ta.maxFontSize, lines = [];
      while (fontSize >= ta.minFontSize) {
        ctx.font = `bold ${fontSize}px Sans`;
        lines = wrapText(ctx, text, maxW);
        if (lines.length * (fontSize*1.3) <= maxH) break;
        fontSize -= 2;
      }
      const lineH = fontSize*1.3, totalH = lines.length*lineH;
      const startY = ta.y + (ta.h-totalH)/2 + lineH/2;
      ctx.font = `bold ${fontSize}px Sans`; ctx.fillStyle = ta.color; ctx.textAlign = ta.align; ctx.textBaseline = ta.baseline;
      lines.forEach((line, i) => ctx.fillText(line, ta.x+ta.w/2, startY+i*lineH));
      fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
      await message.reply({ body: "", attachment: fs.createReadStream(outputPath) });
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (err) { return message.reply(`❌ সমস্যা হয়েছে!\nError: ${err.message}`); }
  }
};
