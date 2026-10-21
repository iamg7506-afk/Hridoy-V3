const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "fakeface", aliases: ["face","ai-face"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Send random fictional face", category: "AI", guide: { en: "{pn}" } },
  onStart: async function ({ api, event }) {
    let filePath = null;
    try {
      const config = (await axios.get(`${API_BASE}/api/links/fakeface`, { timeout: 10000 })).data;
      const apiRes = await axios.get(config.url, { params: config.params, timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } });
      const imageUrl = apiRes.data?.results?.[0]?.picture?.large;
      if (!imageUrl) throw new Error("No image URL returned");
      const cacheDir = path.join(__dirname, "cache"); await fs.ensureDir(cacheDir);
      filePath = path.join(cacheDir, `fakeface_${Date.now()}.jpg`);
      const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } });
      await fs.writeFile(filePath, Buffer.from(imageRes.data));
      await api.sendMessage({ body: config.body, attachment: fs.createReadStream(filePath) }, event.threadID);
    } catch (err) {
      return api.sendMessage("❌ | Couldn't load the face image right now.\n\n🔄 Please try again.", event.threadID);
    } finally {
      if (filePath) { try { await fs.remove(filePath); } catch {} }
    }
  }
};
