const axios = require("axios");
const API_BASE = "https://hridoy-api.onrender.com";
const CMD_NAME = "hpic";
module.exports = {
  config: { name: "hpic", version: "2.1", author: "HR ID OY", countDown: 5, role: 2, shortDescription: { en: "Random Ero / Hot Picture" }, category: "NSFW", guide: { en: "{pn}" } },
  onStart: async function ({ message }) {
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const res = await axios.get(config.url);
    if (!res.data?.items?.length) return message.reply("❌ No image found.");
    const imageUrl = res.data.items[0].url;
    return message.reply({ body: config.body || "🔥 Random Hot Pic", attachment: await global.utils.getStreamFromURL(imageUrl) });
  }
};
