const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "world",
    version: "4.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Random beautiful world image",
    category: "Image",
    guide: "{pn}"
  },

  onStart: async function ({ api, event }) {
    try {
      const cfg = await axios.get(`${API_BASE}/api/links/world`);
      const { url, body } = cfg.data;

      const response = await axios({ url, method: "GET", responseType: "stream" });
      return api.sendMessage({ body, attachment: response.data }, event.threadID, event.messageID);
    } catch (error) {
      return api.sendMessage("❌ Image আনতে সমস্যা হচ্ছে, আবার চেষ্টা করো।", event.threadID, event.messageID);
    }
  }
};
