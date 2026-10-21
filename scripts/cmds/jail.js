const fs = require("fs-extra");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "jail", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "{pn} @mention or reply" } },
  onStart: async function ({ event, message }) {
    const mentionID = Object.keys(event.mentions)[0] || event.messageReply?.senderID;
    if (!mentionID) return message.reply("❌ | Mention someone or reply!");
    const config = (await axios.get(`${API_BASE}/api/images/jail`)).data;
    const ts = Date.now();
    const jailPath = __dirname + `/cache/jail_base_${ts}.png`;
    const avatarPath = __dirname + `/cache/jail_avt_${ts}.jpg`;
    const outputPath = __dirname + `/cache/jail_out_${ts}.jpg`;
    await fs.ensureDir(__dirname + "/cache");
    const [jailRes, avatarRes] = await Promise.all([
      axios.get(config.url, { responseType: "arraybuffer" }),
      axios.get(`https://graph.facebook.com/${mentionID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" })
    ]);
    fs.writeFileSync(jailPath, Buffer.from(jailRes.data));
    fs.writeFileSync(avatarPath, Buffer.from(avatarRes.data));
    const jailImg = await loadImage(jailPath);
    const avatarImg = await loadImage(avatarPath);
    const W = jailImg.width, H = jailImg.height;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(avatarImg, 0, 0, W, H);
    ctx.drawImage(jailImg, 0, 0, W, H);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.92 }));
    await message.reply({ body: config.messages?.[0] || "🔒 You are in jail!", attachment: fs.createReadStream(outputPath) });
    [jailPath, avatarPath, outputPath].forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
  }
};
