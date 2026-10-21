const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "panu", version: "2.1", author: "HR ID OY", category: "NSFW", role: 0, cooldown: 20 },
  onStart: async function({ event, message, api }) {
    api.setMessageReaction("🐣", event.messageID, () => {}, true);
    const config = (await axios.get(`${API_BASE}/api/audio/panu`)).data;
    const randomVideo = config.ids[Math.floor(Math.random() * config.ids.length)];
    await message.reply({ body: config.body, attachment: await global.utils.getStreamFromURL(randomVideo) });
    api.setMessageReaction("✅", event.messageID, () => {}, true);
  }
};
