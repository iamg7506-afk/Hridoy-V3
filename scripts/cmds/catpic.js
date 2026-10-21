const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");

const streamPipeline = promisify(pipeline);
const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "catpic",
    version: "2.0.1",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Random cat image 😺",
    category: "Image",
    guide: "{pn}",
    cooldown: 5
  },

  onStart: async function ({ api, event }) {
    const cacheDir = path.join(__dirname, "cache");
    const cachePath = path.join(cacheDir, `cat_${Date.now()}.jpg`);

    try {
      await fs.ensureDir(cacheDir);

      const cfg = await axios.get(`${API_BASE}/api/links/catpic`);
      const apiUrl = cfg.data?.url;
      if (!apiUrl) throw new Error("No catpic config");

      const res = await axios.get(apiUrl, { timeout: 15000 });
      const imgUrl = res.data?.[0]?.url;
      if (!imgUrl) return api.sendMessage("😿 Cat image load hoilo na...", event.threadID, event.messageID);

      const response = await axios({ url: imgUrl, method: "GET", responseType: "stream", timeout: 20000 });
      await streamPipeline(response.data, fs.createWriteStream(cachePath));

      return api.sendMessage(
        { body: "😺 Random Cat Pic!", attachment: fs.createReadStream(cachePath) },
        event.threadID,
        () => fs.unlink(cachePath).catch(() => {}),
        event.messageID
      );
    } catch (err) {
      return api.sendMessage("⚠️ Cat pic fetch failed... abar try koro 😅", event.threadID, event.messageID);
    }
  }
};
