const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "lyricsvideo", aliases: ["lyricsvid","lvid"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, category: "Media", guide: { en: "{pn} <query>" } },
  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ");
    if (!query) return message.reply("❌ Please provide a song name.");
    api.setMessageReaction("🎵", event.messageID, () => {}, true);
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const config = (await axios.get(`${API_BASE}/api/links/lyricsvideo`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(query + " lyrics video")}`, { timeout: 15000 });
    const results = res.data[config.responseKey] || [];
    if (!results.length) throw new Error("No results found");
    let selected = results.find(v => (v[config.titleKey]||"").toLowerCase().includes("lyrics")) || results[Math.floor(Math.random()*results.length)];
    const videoUrl = selected[config.videoKey];
    const filePath = path.join(cacheDir, `${Date.now()}.mp4`);
    const videoRes = await axios({ url: videoUrl, method: "GET", responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" }, timeout: 60000 });
    fs.writeFileSync(filePath, Buffer.from(videoRes.data));
    api.setMessageReaction("✅", event.messageID, () => {}, true);
    return api.sendMessage({ body: "✦ 𝗟𝗬𝗥𝗜𝗖𝗦 𝗩𝗜𝗗𝗘𝗢 ✦\n━━━━━━━━━━━━━━━━━━\n♫ 𝗘𝗻𝗷𝗼𝘆 𝘆𝗼𝘂𝗿 𝘀𝗼𝗻𝗴 ♫", attachment: fs.createReadStream(filePath) },
      event.threadID, () => { if(fs.existsSync(filePath)) fs.unlinkSync(filePath); }, event.messageID);
  }
};
