const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "ero", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: { en: "Random Ero image" }, category: "NSFW", guide: { en: "{pn}" } },
  onStart: async function ({ message }) {
    const config = (await axios.get(`${API_BASE}/api/links/ero`, { timeout: 10000 })).data;
    const res = await axios.get(config.url, { params: config.params, timeout: 15000 });
    const imageUrl = res.data?.items?.[0]?.url;
    if (!imageUrl) return message.reply("❌ Image load korte problem hocche.");
    return message.reply({ body: config.body, attachment: await global.utils.getStreamFromURL(imageUrl) });
  }
};
