const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "cute", version: "2.1", author: "HR ID OY", role: 0, shortDescription: "Random cute image/video", category: "Image", guide: "{pn}", cooldown: 5 },
  onStart: async function ({ api, event }) {
    try {
      const config = (await axios.get(`${API_BASE}/api/audio/cute`, { timeout: 10000 })).data;
      const url = config.ids[Math.floor(Math.random() * config.ids.length)];
      const stream = await global.utils.getStreamFromURL(url);
      return api.sendMessage({ body: config.body, attachment: stream }, event.threadID, event.messageID);
    } catch (err) {
      return api.sendMessage("⚠️ Cute pic load hoilo na... abar try koro 😅", event.threadID, event.messageID);
    }
  }
};
