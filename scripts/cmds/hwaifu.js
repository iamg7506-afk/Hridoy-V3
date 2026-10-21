const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "hwaifu";
module.exports = {
  config: { name: "hwaifu", version: "2.2", author: "HR ID OY", role: 2, cooldown: 5, description: "Random waifu image", category: "NSFW" },
  onStart: async function ({ message }) {
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const res = await axios.get(config.url);
    const image = res.data?.items?.[0]?.url;
    if (!image) return message.reply("❌ No waifu found.");
    return message.reply({ body: config.body || "💖 Here is your waifu!", attachment: await global.utils.getStreamFromURL(image) });
  }
};
