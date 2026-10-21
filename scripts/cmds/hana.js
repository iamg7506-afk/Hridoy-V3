const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "hana", version: "2.1", author: "HR ID OY", role: 0, category: "NSFW", cooldown: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/audio/hana`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    const stream = await global.utils.getStreamFromURL(url);
    return api.sendMessage({ body: config.body, attachment: stream }, event.threadID, event.messageID);
  }
};
