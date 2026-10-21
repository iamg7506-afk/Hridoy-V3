const API_BASE = "https://hridoy-api.vercel.app";
const axios = require("axios");
module.exports = {
  config: { name: "npic", version: "2.1", author: "HR ID OY", description: "Random NSFW pic", category: "NSFW", cooldowns: 3 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/audio/npic`)).data;
    const randomImage = config.ids[Math.floor(Math.random() * config.ids.length)];
    api.sendMessage({ body: `${config.body}\n𝗦𝗼̂́ 𝗮̉𝗻𝗵: ${config.ids.length}`, attachment: await global.utils.getStreamFromURL(randomImage) }, event.threadID);
  }
};
