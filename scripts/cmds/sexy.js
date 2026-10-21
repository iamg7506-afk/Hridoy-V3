const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "sexy",
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 2,
    shortDescription: "Random Sexy / Ero Image",
    category: "NSFW",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    try {
      // Get API config from gateway
      const cfg = await axios.get(`${API_BASE}/api/links/sexy`);
      const { url, responseKey, body } = cfg.data;

      const res = await axios.get(url);

      // Nested key resolver
      const getVal = (obj, key) => key.split('.').reduce((o, k) => {
        if (!isNaN(k)) return Array.isArray(o) ? o[+k] : o[k];
        return o?.[k];
      }, obj);

      const imageUrl = getVal(res.data, responseKey);
      if (!imageUrl) return message.reply("❌ No image found.");

      return message.reply({ body, attachment: await global.utils.getStreamFromURL(imageUrl) });
    } catch (err) {
      return message.reply("❌ Failed to fetch image.");
    }
  }
};
