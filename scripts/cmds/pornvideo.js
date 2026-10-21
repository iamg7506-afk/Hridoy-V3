const axios = require("axios");
const fs = require("fs");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";

const _k7p = require("crypto");
const _m2x = "cc16e56c1d79beda1e82001c3e27fd865c5129a0f7095c5081c96b2c60e33274";

module.exports = {
  config: { name: "pornvideo", version: "2.1", author: "HR ID OY", countDown: 15, role: 0, shortDescription: "NSFW video search & send", category: "NSFW", guide: { en: "{pn} <keyword>" } },
  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const _q9v = _k7p.createHash("sha256").update(module.exports.config.author || "").digest("hex");
    if (_q9v !== _m2x) return api.sendMessage("⚠️ Unauthorized Modification Detected", threadID, messageID);
    if (!args[0]) return api.sendMessage("⚠️ Keyword dao!\nExample: .pornvideo mom", threadID, messageID);
    const keyword = args.join(" ");
    const loading = await api.sendMessage(`🔍 "${keyword}" search korchi...`, threadID, messageID);
    const config = (await axios.get(`${API_BASE}/api/links/pornvideo`)).data;
    const searchRes = await axios.get(config.url, { params: { [config.queryParam]: keyword }, timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } });
    let data = searchRes.data;
    if (typeof data === "string") data = JSON.parse(data);
    if (!data.videos?.length) return api.editMessage(`❌ "${keyword}" diye kono video pawa jay nai.`, loading.messageID);
    const video = data.videos[Math.floor(Math.random() * data.videos.length)];
    const directUrl = video.directMp4Url || video.mp4 || video.url;
    if (!directUrl) return api.editMessage("❌ Direct link pawa jay nai.", loading.messageID);
    let fileSize = 0;
    try { const head = await axios.head(directUrl, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.xvideos.com/" } }); fileSize = parseInt(head.headers["content-length"] || 0); } catch {}
    const maxSize = config.maxSize || 25165824;
    if (fileSize > maxSize) { return api.editMessage(`⚠️ Video size boro (${(fileSize/1024/1024).toFixed(1)} MB)\n🔗 ${video.videoPage || ""}\n📥 ${directUrl}`, loading.messageID); }
    await api.editMessage(`⬇️ Download hocche... (${(fileSize/1024/1024).toFixed(1)} MB)`, loading.messageID);
    const tempPath = path.join(__dirname, "cache", `xvideo_${Date.now()}.mp4`);
    if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
    const response = await axios({ method: "GET", url: directUrl, responseType: "stream", timeout: 90000, headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.xvideos.com/" } });
    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
    await api.sendMessage({ body: `🎬 ${video.title || "XVideos"}`, attachment: fs.createReadStream(tempPath) }, threadID, () => { try { fs.unlinkSync(tempPath); } catch {} });
    api.unsendMessage(loading.messageID);
  }
};
