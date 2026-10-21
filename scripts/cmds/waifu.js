const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "waifu",
    version: "2.2",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Random waifu image",
    category: "Image",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    try {
      const cfg = await axios.get(`${API_BASE}/api/links/waifu_random`);
      const { url, responseKey, body } = cfg.data;

      const res = await axios.get(url);
      const imgUrl = responseKey.split('.').reduce((o, k) => {
        return (!isNaN(k) && Array.isArray(o)) ? o[+k] : o?.[k];
      }, res.data);

      return message.reply({ body, attachment: await global.utils.getStreamFromURL(imgUrl) });
    } catch (e) {
      return message.reply("❌ API error: " + e.message);
    }
  }
};
