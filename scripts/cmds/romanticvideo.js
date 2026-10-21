const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "romanticvideo", aliases: ["rv"], version: "2.2", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Send romantic video", category: "Media" },
  onLoad: function () {
    if (module.exports.config.author !== "HR ID OY")
      throw new Error("❌ Do not change the author name! File stopped.");
  },
  onStart: async function ({ api, event }) {
    api.setMessageReaction("💗", event.messageID, () => {}, true);
    const preMsg = await api.sendMessage("⏳💖 𝐀𝐩𝐧𝐚𝐫 𝐯𝐢𝐝𝐞𝐨 𝐭𝐢 𝐮𝐩𝐥𝐨𝐚𝐝 𝐤𝐨𝐫𝐚 𝐡𝐨𝐬𝐬𝐞...\n🌸 𝐊𝐢𝐬𝐮 𝐤𝐡𝐨𝐧 𝐨𝐩𝐞𝐤𝐡𝐚 𝐤𝐨𝐫𝐮𝐧 💞", event.threadID);
    const config = (await axios.get(`${API_BASE}/api/audio/romanticvideo`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    const caption = config.captions[Math.floor(Math.random() * config.captions.length)];
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `romantic_${Date.now()}.mp4`);
    try {
      const res = await axios({ method: "GET", url, responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" }, maxRedirects: 5 });
      await fs.writeFile(filePath, res.data);
      if (fs.existsSync(filePath) && (await fs.stat(filePath)).size > 0) {
        await api.sendMessage({ body: `${caption}\n\n💝 𝐎𝐰𝐧𝐞𝐫: 𝐑𝐨𝐜𝐤𝐲`, attachment: fs.createReadStream(filePath) },
          event.threadID, async () => { try { if (preMsg?.messageID) await api.unsendMessage(preMsg.messageID); } catch {} });
        fs.unlink(filePath).catch(() => {});
      } else {
        api.sendMessage("⚠️ Error: Video could not be saved.", event.threadID);
        if (preMsg?.messageID) api.unsendMessage(preMsg.messageID);
      }
    } catch (err) {
      api.sendMessage("❌ An error occurred.", event.threadID);
    }
  }
};
