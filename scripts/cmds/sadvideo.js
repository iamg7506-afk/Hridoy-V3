const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "sad",
    version: "3.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    category: "Media",
    shortDescription: "Random sad/funny video",
    guide: "{pn}"
  },

  onStart: async function ({ api, event }) {
    try {
      // Fetch video list from api.json
      const res = await axios.get(`${API_BASE}/api/audio/sadvideo`);
      const { ids, body } = res.data;
      const video = ids[Math.floor(Math.random() * ids.length)];

      const cacheDir = path.join(__dirname, "cache");
      const filePath = path.join(cacheDir, `sad_${Date.now()}.mp4`);
      await fs.ensureDir(cacheDir);

      const response = await axios({ method: "GET", url: video, responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
      fs.writeFileSync(filePath, Buffer.from(response.data));

      await api.sendMessage({ body, attachment: fs.createReadStream(filePath) }, event.threadID);
      fs.unlinkSync(filePath);
    } catch (e) {
      api.sendMessage(`❌ Error:\n${e.message}`, event.threadID);
    }
  }
};
