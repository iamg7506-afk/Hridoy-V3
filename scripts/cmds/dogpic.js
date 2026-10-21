const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "dogpic";

module.exports = {
  config: {
    name: "dogpic", version: "2.1", author: "HR ID OY",
    role: 0, shortDescription: "Random dog image 🐶", category: "Image", guide: "{pn}", cooldown: 5
  },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const cachePath = path.join(__dirname, "cache", `dog_${Date.now()}.jpg`);
    await fs.ensureDir(path.dirname(cachePath));
    const res = await axios.get(config.url, { timeout: 15000 });
    const imgUrl = res?.data?.message;
    if (!imgUrl) return api.sendMessage("🐕 Dog pic load hoilo na...", event.threadID, event.messageID);
    const response = await axios({ url: imgUrl, method: "GET", responseType: "stream", timeout: 20000 });
    await streamPipeline(response.data, fs.createWriteStream(cachePath));
    return api.sendMessage({ body: config.body || "🐶 Random Dog Pic!", attachment: fs.createReadStream(cachePath) },
      event.threadID, () => fs.unlink(cachePath).catch(() => {}), event.messageID);
  }
};
