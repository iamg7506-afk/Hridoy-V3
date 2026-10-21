const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "trap",
    version: "2.1",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Random trap anime image",
    category: "NSFW",
    guide: "{pn}",
    cooldown: 5
  },

  onStart: async function ({ api, event }) {
    try {
      const cfg = await axios.get(`${API_BASE}/api/links/trap`);
      const { url, responseKey, body } = cfg.data;

      const res = await axios.get(url);
      const imgUrl = res.data[responseKey];

      return api.sendMessage({
        body,
        attachment: await global.utils.getStreamFromURL(imgUrl)
      }, event.threadID, event.messageID);
    } catch (e) {
      return api.sendMessage("⚠️ Failed!", event.threadID, event.messageID);
    }
  }
};
