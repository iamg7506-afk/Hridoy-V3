const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "funny";

module.exports = {
  config: {
    name: "funny", version: "2.1", author: "HR ID OY",
    countDown: 5, role: 0, category: "Media", shortDescription: "Random funny video"
  },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/audio/${CMD_NAME}`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    const filePath = path.join(__dirname, "cache", `funny_${Date.now()}.mp4`);
    await fs.ensureDir(path.dirname(filePath));
    const res = await axios({ method: "GET", url, responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
    fs.writeFileSync(filePath, Buffer.from(res.data));
    await api.sendMessage({ body: config.body || "😂 Here's Your Funny Video!", attachment: fs.createReadStream(filePath) }, event.threadID);
    fs.unlinkSync(filePath);
  }
};
