const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "pussy", version: "2.1", author: "HR ID OY", countDown: 8, role: 0, shortDescription: "Random pussy pic from Night API", category: "NSFW", guide: "{pn}" },
  onStart: async function ({ message, api, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/pussy`)).data;
    const response = await axios.get(config.url, { headers: { [config.authHeader]: config.apiKey } });
    if (!response.data?.content?.url) return message.reply("API থেকে pic লোড হচ্ছে না 😔 আবার ট্রাই করো!");
    await api.sendMessage({ body: `😈 ${config.category.toUpperCase()} pic তোমার জন্য!`, attachment: await global.utils.getStreamFromURL(response.data.content.url) }, event.threadID, event.messageID);
  }
};
