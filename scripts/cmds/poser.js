const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "poster", version: "2.2", author: "HR ID OY", category: "Tag Fun", guide: { en: "{p}poser @tag | reply | uid" } },
  onStart: async function ({ api, event, args, message }) {
    let targetID, targetName;
    if (event.mentions && Object.keys(event.mentions).length > 0) { targetID = Object.keys(event.mentions)[0]; targetName = Object.values(event.mentions)[0].replace("@","").trim(); }
    else if (event.type === "message_reply") { targetID = event.messageReply.senderID; try { const info = await api.getUserInfo(targetID); targetName = info[targetID]?.name||"Unknown"; } catch { targetName="Unknown"; } }
    else if (args[0] && /^\d+$/.test(args[0])) { targetID = args[0]; try { const info = await api.getUserInfo(targetID); targetName = info[targetID]?.name||"Unknown"; } catch { targetName="Unknown"; } }
    else return message.reply("📌 Usage:\n• /poser @tag\n• /poser 123456789\n• reply kore /poser");
    const cacheDir = path.join(__dirname, "cache"); await fs.ensureDir(cacheDir);
    const config = (await axios.get(`${API_BASE}/api/images/poser`)).data;
    const templatePath = path.join(cacheDir, "poser_template.jpg");
    if (!await fs.pathExists(templatePath)) { const t = await axios({ url: config.url, responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } }); await fs.writeFile(templatePath, t.data); }
    const avatarURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const avatarPath = path.join(cacheDir, `avt_${targetID}.jpg`);
    const a = await axios({ url: avatarURL, responseType: "arraybuffer" }); await fs.writeFile(avatarPath, a.data);
    const templateImg = await loadImage(templatePath), W = templateImg.width, H = templateImg.height;
    const canvas = createCanvas(W, H), ctx = canvas.getContext("2d");
    ctx.drawImage(templateImg, 0, 0, W, H);
    const picSize = Math.floor(H * 0.28), picX = Math.floor((W-picSize)/2), picY = Math.floor(H*0.30);
    const avatarImg = await loadImage(avatarPath);
    ctx.save(); ctx.beginPath(); ctx.rect(picX, picY, picSize, picSize); ctx.clip(); ctx.drawImage(avatarImg, picX, picY, picSize, picSize); ctx.restore();
    const fontSize = Math.floor(W * 0.065);
    ctx.font = `bold ${fontSize}px Arial`; ctx.fillStyle = "#000000"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(targetName, W/2, picY+picSize+14);
    const outPath = path.join(cacheDir, `poser_out_${Date.now()}.jpg`);
    await fs.writeFile(outPath, canvas.toBuffer("image/jpeg", { quality: 0.92 }));
    const body = (config.messages?.[0]||"😂 {name} — poser confirmed!").replace("{name}",targetName);
    await message.reply({ body, attachment: fs.createReadStream(outPath) });
    setTimeout(() => { fs.remove(avatarPath).catch(()=>{}); fs.remove(outPath).catch(()=>{}); }, 5000);
  }
};
