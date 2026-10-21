const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "ranipic", version: "2.2", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Random Anime Pic", category: "Image", guide: "{pn}" },
  onStart: async function ({ message }) {
    const config = (await axios.get(`${API_BASE}/api/audio/ranipic`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    return message.reply({ body: config.body, attachment: await global.utils.getStreamFromURL(url) });
  }
};
