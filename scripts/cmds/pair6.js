const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "pair6", aliases: ["pr6"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Love", guide: "{pn}" },
  onStart: async function ({ api, event, usersData }) {
    const { threadID, senderID, messageID, participantIDs, messageReply } = event;
    let targetID = messageReply ? messageReply.senderID : participantIDs.filter(id=>id!==senderID&&id!==api.getCurrentUserID())[Math.floor(Math.random()*participantIDs.length)];
    const [name1, name2] = await Promise.all([usersData.getName(senderID), usersData.getName(targetID)]);
    const config = (await axios.get(`${API_BASE}/api/images/pair6`)).data;
    const [bg, img1, img2] = await Promise.all([loadImage(config.url), loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`), loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)]);
    const canvas = createCanvas(bg.width, bg.height), ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0);
    const draw = (img, pos) => { ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2); ctx.clip(); ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore(); };
    draw(img1, config.positions.sender); draw(img2, config.positions.target);
    const pathImg = __dirname + `/cache/pair6_${senderID}.png`; fs.ensureDirSync(__dirname+"/cache");
    fs.writeFileSync(pathImg, canvas.toBuffer("image/png"));
    const body = (config.messages?.[0]||"✨ {sender} ❤️ X ❤️ {target}\n🌸 May this bond be forever beautiful! 🦋").replace("{sender}",name1).replace("{target}",name2);
    api.sendMessage({ body, mentions: [{tag:name1,id:senderID},{tag:name2,id:targetID}], attachment: fs.createReadStream(pathImg) }, threadID, () => fs.unlinkSync(pathImg), messageID);
  }
};
