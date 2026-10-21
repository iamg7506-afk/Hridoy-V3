const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "girl", version: "2.1", author: "HR ID OY", role: 0, shortDescription: "Random girl image", category: "NSFW", guide: "{pn}", cooldown: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/audio/girl`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    try {
      const stream = await global.utils.getStreamFromURL(url);
      return api.sendMessage({ body: config.body, attachment: stream }, event.threadID, event.messageID);
    } catch (err) {
      return api.sendMessage("⚠️ GF aste aste chole ashtese... abar try koro 😅", event.threadID, event.messageID);
    }
  }
};
