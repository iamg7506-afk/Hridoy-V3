const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "gf", version: "2.1", author: "HR ID OY", role: 0, shortDescription: "Random GF image/video", category: "Image", cooldown: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/audio/gf`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    try {
      const res = await axios.get(url, { responseType: "stream" });
      return api.sendMessage({ body: config.body, attachment: res.data }, event.threadID, event.messageID);
    } catch (err) {
      return api.sendMessage("⚠️ Load fail, try again 😅", event.threadID, event.messageID);
    }
  }
};
