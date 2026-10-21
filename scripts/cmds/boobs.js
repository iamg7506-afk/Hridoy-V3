const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "boobs",
    aliases: ["boob"],
    version: "2.1",
    author: "HR ID OY",
    countDown: 8,
    role: 2,
    shortDescription: "Random boobs pic from Night API",
    longDescription: "NSFW image send করে।",
    category: "NSFW",
    guide: "{pn}"
  },

  onStart: async function ({ message, api, event }) {
    try {
      const cfg = await axios.get(`${API_BASE}/api/links/boobs`);
      const { url, apiKey, authHeader, responseKey } = cfg.data;

      const response = await axios.get(url, { headers: { [authHeader]: apiKey } });

      const imageUrl = responseKey.split(".").reduce((o, k) => o?.[k], response.data);
      if (!imageUrl) return message.reply("API থেকে pic লোড হচ্ছে না 😔");

      const attachment = await global.utils.getStreamFromURL(imageUrl);
      await api.sendMessage({ body: "😈 BOOBS pic তোমার জন্য!", attachment }, event.threadID, event.messageID);
    } catch (error) {
      return message.reply("Error! " + (error.response?.status || error.message));
    }
  }
};
