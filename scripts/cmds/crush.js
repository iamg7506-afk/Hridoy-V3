const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const fs = require("fs-extra");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "crush", version: "2.1", author: "HR ID OY", role: 0, category: "Love", guide: "{pn} [1-10] @mention or just {pn}" },
  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const config = (await axios.get(`${API_BASE}/api/images/crush`)).data;
    let bgChoice = args[0];
    if (!config.url[bgChoice]) bgChoice = String(Math.floor(Math.random()*10)+1);
    const bgUrl = config.url[bgChoice];
    let targetID = Object.keys(mentions)[0] || (messageReply ? messageReply.senderID : null);
    if (!targetID) {
      const threadInfo = await api.getThreadInfo(threadID);
      const myData = threadInfo.userInfo.find(u=>u.id===senderID);
      const myGender = myData?.gender?.toUpperCase();
      const candidates = myGender==="MALE" ? threadInfo.userInfo.filter(u=>u.gender==="FEMALE"&&u.id!==senderID) : myGender==="FEMALE" ? threadInfo.userInfo.filter(u=>u.gender==="MALE"&&u.id!==senderID) : [];
      if (!candidates.length) return api.sendMessage("❌ No match found.", threadID, messageID);
      targetID = candidates[Math.floor(Math.random()*candidates.length)].id;
    }
    const [bgRes, av1Res, av2Res] = await Promise.all([
      axios.get(bgUrl, { responseType: "arraybuffer" }),
      axios.get(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }),
      axios.get(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" })
    ]);
    const [bg, av1, av2] = await Promise.all([loadImage(bgRes.data), loadImage(av1Res.data), loadImage(av2Res.data)]);
    const canvas = createCanvas(bg.width, bg.height), ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    const draw = (img, pos) => { ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2); ctx.closePath(); ctx.clip(); ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore(); };
    draw(av1, config.positions.sender); draw(av2, config.positions.target);
    const pathImg = __dirname + `/cache/crush_${Date.now()}.png`; await fs.ensureDir(__dirname+"/cache");
    fs.writeFileSync(pathImg, canvas.toBuffer("image/png"));
    const allInfo = await api.getUserInfo([senderID, targetID]);
    const name1 = allInfo[senderID]?.name||"User", name2 = allInfo[targetID]?.name||"Crush";
    const love = Math.floor(Math.random()*21)+80;
    const body = (config.messages?.[0]||"💞 {sender} & {target}\n🕊️ Compatibility: {love}%").replace("{sender}",name1).replace("{target}",name2).replace("{love}",love);
    return api.sendMessage({ body, attachment: fs.createReadStream(pathImg) }, threadID, () => fs.unlinkSync(pathImg), messageID);
  }
};
