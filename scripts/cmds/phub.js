const axios = require("axios");
const fs = require("fs-extra");
const { loadImage, createCanvas } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "phub", version: "2.1", author: "HR ID OY", countDown: 10, role: 0, category: "Image", guide: { en: "{pn} [text]" } },
  wrapText: async (ctx, text, maxWidth) => {
    return new Promise(r => {
      if (ctx.measureText(text).width < maxWidth) return r([text]);
      const words = text.split(' '), lines = []; let line = '';
      while (words.length > 0) {
        let split = false;
        while (ctx.measureText(words[0]).width >= maxWidth) { const t=words[0]; words[0]=t.slice(0,-1); if(split) words[1]=`${t.slice(-1)}${words[1]}`; else { split=true; words.splice(1,0,t.slice(-1)); } }
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) line+=`${words.shift()} `;
        else { lines.push(line.trim()); line=''; }
        if (words.length===0) lines.push(line.trim());
      }
      r(lines);
    });
  },
  onStart: async function ({ api, event, args }) {
    const { senderID, threadID, messageID } = event;
    const text = args.join(" ");
    if (!text) return api.sendMessage("Post the content of the comment on ponhub", threadID, messageID);
    const config = (await axios.get(`${API_BASE}/api/images/phub`)).data;
    const name = (await api.getUserInfo(senderID))[senderID].name;
    const linkAvatar = (await api.getUserInfo(senderID))[senderID].thumbSrc;
    const [avatarData, pornData] = await Promise.all([
      axios.get(linkAvatar, { responseType: 'arraybuffer' }),
      axios.get(config.url, { responseType: 'arraybuffer' })
    ]);
    const avatar = await loadImage(avatarData.data);
    const baseImage = await loadImage(pornData.data);
    const canvas = createCanvas(baseImage.width, baseImage.height), ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    const ap = config.avatarPosition;
    ctx.drawImage(avatar, ap.x, ap.y, ap.w, ap.h);
    const nt = config.nameText;
    ctx.font = nt.font; ctx.fillStyle = nt.color; ctx.textAlign = "start"; ctx.fillText(name, nt.x, nt.y);
    const ct = config.commentText;
    ctx.font = ct.font; ctx.fillStyle = ct.color;
    const lines = await this.wrapText(ctx, text, ct.maxWidth);
    ctx.fillText(lines.join('\n'), ct.x, ct.y);
    const pathImg = __dirname + '/cache/phub.png'; await fs.ensureDir(__dirname+'/cache');
    fs.writeFileSync(pathImg, canvas.toBuffer());
    return api.sendMessage({ attachment: fs.createReadStream(pathImg) }, threadID, () => fs.unlinkSync(pathImg), messageID);
  }
};
