const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "romantic", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Random romantic video", category: "Media" },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/audio/romantic`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    const res = await axios({ method: "GET", url, responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
    const fs = require("fs-extra");
    const path = require("path");
    const filePath = path.join(__dirname, "cache", `romantic_${Date.now()}.mp4`);
    await fs.ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, Buffer.from(res.data));
    await api.sendMessage({ body: config.body, attachment: fs.createReadStream(filePath) }, event.threadID,
      () => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); });
  }
};
