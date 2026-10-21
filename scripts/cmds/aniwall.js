const axios = require("axios");
const path = require("path");
const fs = require("fs");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "aniwall";

module.exports = {
  config: {
    name: "animewallpaper",
    aliases: ["aniwall"],
    version: "2.1",
    author: "HR ID OY",
    role: 0,
    countDown: 5,
    category: "Image",
    guide: { en: "{pn} <title> - <count>\nExample: {pn} Naruto - 10" }
  },

  onStart: async function ({ api, event, args }) {
    try {
      if (!args[0]) {
        return api.sendMessage(
          "❌ Please provide an anime title.\nExample: /aniwall Kakashi - 10",
          event.threadID, event.messageID
        );
      }

      let input = args.join(" ");
      let count = 5;
      if (input.includes("-")) {
        const parts = input.split("-");
        input = parts[0].trim();
        count = parseInt(parts[1].trim()) || 5;
      }
      if (count > 50) count = 50;

      const configRes = await axios.get(`${API_BASE}/api/links/${CMD_NAME}`);
      const config = configRes.data;

      const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(input)}`);
      const data = res.data?.wallpapers || [];

      if (data.length === 0) {
        return api.sendMessage(`❌ No wallpapers found for "${input}".`, event.threadID, event.messageID);
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const attachments = [];
      for (let i = 0; i < Math.min(count, data.length); i++) {
        try {
          const imgRes = await axios.get(data[i], { responseType: "arraybuffer" });
          const imgPath = path.join(cacheDir, `aniwall_${i + 1}.jpg`);
          await fs.promises.writeFile(imgPath, imgRes.data);
          attachments.push(fs.createReadStream(imgPath));
        } catch (e) {
          console.warn(`⚠️ Failed image ${i + 1}:`, e.message);
        }
      }

      await api.sendMessage({
        body: `✅ Anime wallpapers for "${input}"\n🖼 Total: ${attachments.length}`,
        attachment: attachments
      }, event.threadID, event.messageID);

      await fs.promises.rm(cacheDir, { recursive: true, force: true });

    } catch (err) {
      console.error("AnimeWallpaper Error:", err);
      return api.sendMessage(`⚠️ Error: ${err.message}`, event.threadID, event.messageID);
    }
  }
};
