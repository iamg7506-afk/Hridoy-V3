const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "hug";

module.exports = {
  config: { name: "hug", aliases: ["embrace"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Give someone a warm hug! 💕", category: "Love", guide: "{pn} @mention or reply" },
  onStart: async function ({ event, api, usersData }) {
    const processingMsg = await api.sendMessage("🔄 Preparing a warm hug...", event.threadID);
    let targetID = Object.keys(event.mentions)[0] || event.messageReply?.senderID;
    if (!targetID) { await api.unsendMessage(processingMsg.messageID); return api.sendMessage("💝 Please tag someone or reply!", event.threadID, event.messageID); }
    if (targetID === event.senderID) { await api.unsendMessage(processingMsg.messageID); return api.sendMessage("🤗 You can't hug yourself! 💕", event.threadID, event.messageID); }
    const huggerID = event.senderID;
    const huggerName = await usersData.getName(huggerID) || "Someone";
    const targetName = event.mentions[Object.keys(event.mentions)[0]] || await usersData.getName(targetID) || "Friend";
    const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`)).data;
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
    const getAvatar = async (uid) => {
      const res = await axios.get(`https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${token}`, { responseType: "arraybuffer", timeout: 10000 });
      const p = path.join(__dirname, `tmp/${uid}_av.png`);
      if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, res.data); return p;
    };
    let bg;
    try { bg = await loadImage(config.url); } catch { bg = null; }
    const canvas = createCanvas(bg?.width || 800, bg?.height || 600);
    const ctx = canvas.getContext("2d");
    if (bg) { ctx.drawImage(bg, 0, 0); } else {
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, "#FFB6C1"); g.addColorStop(1, "#FF69B4");
      ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const huggerPath = await getAvatar(huggerID);
    const targetPath = await getAvatar(targetID);
    const huggerAv = await loadImage(huggerPath);
    const targetAv = await loadImage(targetPath);
    const pos = config.positions;
    const drawCircle = (img, p) => {
      const cx = p.cx || p.x + p.r, cy = p.cy || p.y + p.r, r = p.r || p.w/2;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.closePath(); ctx.clip();
      ctx.drawImage(img, cx-r, cy-r, r*2, r*2); ctx.restore();
    };
    drawCircle(huggerAv, pos.sender); drawCircle(targetAv, pos.target);
    const tp = config.textPositions || {};
    ctx.font = "bold 32px Arial"; ctx.fillStyle = "#FF1493"; ctx.textAlign = "center";
    ctx.fillText("💕 Virtual Hug 💕", canvas.width/2, 50);
    ctx.font = "bold 22px Arial"; ctx.fillStyle = "#FFFFFF";
    ctx.fillText(huggerName, (tp.sender?.x || 210)); ctx.fillText(targetName, (tp.target?.x || 490));
    ctx.strokeStyle = "#FF69B4"; ctx.lineWidth = 10; ctx.strokeRect(0, 0, canvas.width, canvas.height);
    const output = path.join(__dirname, "tmp/hug_output.png");
    fs.writeFileSync(output, canvas.toBuffer("image/png"));
    const msgs = config.messages || ["💝 {sender} just gave {target} a warm hug! 🥰"];
    const body = msgs[Math.floor(Math.random() * msgs.length)].replace("{sender}", huggerName).replace("{target}", targetName);
    await api.sendMessage({ body, attachment: fs.createReadStream(output), mentions: [{ tag: targetName, id: targetID }, { tag: huggerName, id: huggerID }] },
      event.threadID, async () => {
        try { [output, huggerPath, targetPath].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); }); await api.unsendMessage(processingMsg.messageID); } catch {}
      });
  }
};
