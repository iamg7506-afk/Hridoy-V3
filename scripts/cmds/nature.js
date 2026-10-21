const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "nature", version: "2.1", author: "HR ID OY", role: 0, shortDescription: "Random nature photo 🌿", category: "Image", guide: "{pn}", cooldown: 5 },
  onStart: async function ({ api, event }) {
    const cachePath = path.join(__dirname, "cache", `nature_${Date.now()}.jpg`);
    await fs.ensureDir(path.dirname(cachePath));
    const config = (await axios.get(`${API_BASE}/api/links/nature`)).data;
    const res = await axios.get(config.url, { headers: { [config.authHeader]: config.apiKey } });
    const photos = res.data?.photos;
    if (!photos?.length) return api.sendMessage("⚠️ No nature photos found!", event.threadID, event.messageID);
    const photo = photos[Math.floor(Math.random() * photos.length)];
    const photoUrl = photo.src.large2x || photo.src.large || photo.src.original;
    const response = await axios({ url: photoUrl, method: "GET", responseType: "stream" });
    const writer = fs.createWriteStream(cachePath);
    response.data.pipe(writer);
    writer.on("finish", () => api.sendMessage({ body: config.body, attachment: fs.createReadStream(cachePath) }, event.threadID, () => fs.unlink(cachePath).catch(()=>{}), event.messageID));
  }
};
