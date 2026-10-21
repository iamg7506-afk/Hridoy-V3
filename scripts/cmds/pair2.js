const { loadImage, createCanvas } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "pair2", shortDescription: "Pair2 (Love)", guide: "{pn}", author: "HR ID OY", countDown: 5, role: 0, category: "Love", version: "1.0" },
  onStart: async function ({ api, event }) {
    const id1 = event.senderID;
    const name1 = (await api.getUserInfo(id1))[id1].name;
    const ThreadInfo = await api.getThreadInfo(event.threadID);
    const all = ThreadInfo.userInfo;
    let gender1; for (let c of all) if (c.id == id1) gender1 = c.gender;
    const botID = api.getCurrentUserID();
    let candidates = gender1 == "FEMALE" ? all.filter(u => u.gender=="MALE"&&u.id!==id1&&u.id!==botID).map(u=>u.id)
      : gender1 == "MALE" ? all.filter(u => u.gender=="FEMALE"&&u.id!==id1&&u.id!==botID).map(u=>u.id)
      : all.filter(u => u.id!==id1&&u.id!==botID).map(u=>u.id);
    if (!candidates.length) return api.sendMessage("No suitable partner found.", event.threadID);
    const id2 = candidates[Math.floor(Math.random() * candidates.length)];
    const name2 = (await api.getUserInfo(id2))[id2].name;
    const matchRate = [Math.floor(Math.random()*100)+1,"-𝟭","𝟵𝟵.𝟵𝟵","𝟭𝟵","∞","𝟭𝟬𝟭","𝟬.𝟬𝟭"][Math.floor(Math.random()*7)];
    const notes = ["𝗘𝘃𝗲𝗿𝘆 𝘁𝗶𝗺𝗲 𝗜 𝘀𝗲𝗲 𝘆𝗼𝘂, 𝗺𝘆 𝗵𝗲𝗮𝗿𝘁 𝘀𝗸𝗶𝗽𝘀 𝗮 𝗯𝗲𝗮𝘁.","𝗬𝗼𝘂'𝗿𝗲 𝗺𝘆 𝘁𝗼𝗱𝗮𝘆 𝗮𝗻𝗱 𝗮𝗹𝗹 𝗼𝗳 𝗺𝘆 𝘁𝗼𝗺𝗼𝗿𝗿𝗼𝘄𝘀."];
    const config = (await axios.get(`${API_BASE}/api/images/pair2`)).data;
    const pathImg = __dirname + "/cache/pair2bg.png";
    const pathAvt1 = __dirname + "/cache/pair2av1.png";
    const pathAvt2 = __dirname + "/cache/pair2av2.png";
    await fs.ensureDir(__dirname + "/cache");
    let [bg, avt1, avt2] = await Promise.all([
      axios.get(config.url, { responseType: "arraybuffer" }),
      axios.get(`https://graph.facebook.com/${id1}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }),
      axios.get(`https://graph.facebook.com/${id2}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" })
    ]);
    fs.writeFileSync(pathImg, Buffer.from(bg.data)); fs.writeFileSync(pathAvt1, Buffer.from(avt1.data)); fs.writeFileSync(pathAvt2, Buffer.from(avt2.data));
    const baseImage = await loadImage(pathImg), imgAvt1 = await loadImage(pathAvt1), imgAvt2 = await loadImage(pathAvt2);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    const pos = config.positions;
    ctx.drawImage(imgAvt1, pos.sender.x, pos.sender.y, pos.sender.w, pos.sender.h);
    const tx = pos.target.xFromRight !== undefined ? canvas.width - pos.target.xFromRight : pos.target.x;
    ctx.drawImage(imgAvt2, tx, pos.target.y, pos.target.w, pos.target.h);
    fs.writeFileSync(pathImg, canvas.toBuffer()); fs.removeSync(pathAvt1); fs.removeSync(pathAvt2);
    const lovelyNote = notes[Math.floor(Math.random() * notes.length)];
    return api.sendMessage({ body: `\n🌸💞 *Cᴏɴɢʀᴀᴛs* 💞🌸  \n@${name1}  ＆ @${name2} ✨\n\n💖 *Mᴀᴛᴄʜ Rᴀᴛᴇ:* ${matchRate}% 💖\n\n🌷 𝓛𝓸𝓿𝓮𝓵𝔂 𝓝𝓸𝓽𝓮 🌷  \n❝ ${lovelyNote}❞\n\n💫 𝒀𝒐𝒖 𝒂𝒓𝒆 𝒎𝒚 𝒔𝒖𝒏𝒔𝒉𝒊𝒏𝒆! 💫`,
      mentions: [{ tag: name1, id: id1 }, { tag: name2, id: id2 }], attachment: fs.createReadStream(pathImg) },
      event.threadID, () => fs.unlinkSync(pathImg), event.messageID);
  }
};
