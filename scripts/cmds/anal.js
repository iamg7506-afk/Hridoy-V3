const axios = require('axios');

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "anal";

module.exports = {
  config: {
    name: "anal",
    version: "2.1",
    author: "HR ID OY",
    countDown: 8,
    role: 2,
    shortDescription: "Random anal pic from Nights API",
    longDescription: "NSFW image send করে।",
    category: "NSFW",
    guide: "{pn}"
  },

  onStart: async function ({ message, api, event }) {
    try {
      const configRes = await axios.get(`${API_BASE}/api/links/${CMD_NAME}`);
      const config = configRes.data;

      const response = await axios.get(config.url, {
        headers: { [config.authHeader]: config.apiKey }
      });

      if (response.status !== 200 || !response.data?.content?.url) {
        return message.reply("API থেকে pic লোড হচ্ছে না 😔 আবার ট্রাই করো!");
      }

      const imageUrl = response.data.content.url;
      const attachment = await global.utils.getStreamFromURL(imageUrl);

      await api.sendMessage({
        body: `😈 ${config.category.toUpperCase()} pic তোমার জন্য!`,
        attachment
      }, event.threadID, event.messageID);

    } catch (error) {
      console.error("NSFW Error:", error);
      return message.reply("Error! Limit শেষ বা key issue হতে পারে।");
    }
  }
};
