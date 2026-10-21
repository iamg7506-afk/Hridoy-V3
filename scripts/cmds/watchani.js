const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "watchani",
    version: "2.1",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Random anime recommendation pic",
    category: "Image",
    guide: "{pn}",
    cooldowns: 5
  },

  onStart: async function ({ api, event }) {
    try {
      const res = await axios.get(`${API_BASE}/api/audio/watchani`);
      const { ids, body } = res.data;
      const shuffled = [...ids].sort(() => 0.5 - Math.random());

      for (let i = 0; i < Math.min(5, shuffled.length); i++) {
        try {
          const stream = await axios.get(shuffled[i], {
            responseType: "stream", timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          return api.sendMessage({ body, attachment: stream.data }, event.threadID, event.messageID);
        } catch { continue; }
      }
      return api.sendMessage("❌ Failed to load image after retries.", event.threadID, event.messageID);
    } catch (err) {
      return api.sendMessage("❌ API error: " + err.message, event.threadID, event.messageID);
    }
  }
};
