const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "meme2", version: "2.1", author: "HR ID OY", role: 0, shortDescription: "Random meme 😆", category: "Image", guide: "{pn}", countDown: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/meme2`)).data;
    const res = await axios.get(config.url);
    if (!res.data?.url) return api.sendMessage("😅 Meme load hoilo na...", event.threadID, event.messageID);
    const memeUrl = res.data.url;
    const title = res.data[config.titleKey] || "Meme";
    const subreddit = res.data[config.subredditKey] || "Unknown";
    const ext = path.extname(memeUrl.split("?")[0]) || ".jpg";
    const filePath = path.join(__dirname, "cache", `meme_${Date.now()}${ext}`);
    await fs.ensureDir(path.dirname(filePath));
    const response = await axios({ method: "GET", url: memeUrl, responseType: "arraybuffer" });
    fs.writeFileSync(filePath, response.data);
    api.sendMessage({ body: `😂 ${title}\n📌 Subreddit: r/${subreddit}`, attachment: fs.createReadStream(filePath) },
      event.threadID, () => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, event.messageID);
  }
};
