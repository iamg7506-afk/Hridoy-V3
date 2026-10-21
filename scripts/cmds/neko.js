const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "neko", version: "2.1", author: "HR ID OY", role: 0, shortDescription: "Random neko image 🐱", category: "Image", guide: "{pn}", cooldown: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/neko`)).data;
    const res = await axios.get(config.url);
    const imageUrl = res.data[config.responseKey];
    if (!imageUrl) return api.sendMessage("❌ Neko image not found!", event.threadID, event.messageID);
    return api.sendMessage({ body: config.body, attachment: await global.utils.getStreamFromURL(imageUrl) }, event.threadID, event.messageID);
  }
};
