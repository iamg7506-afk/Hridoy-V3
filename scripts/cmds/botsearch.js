const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "botsearch",
    version: "2.1",
    author: "HR ID OY",
    description: "Search using Google Custom Search",
    category: "AI",
    guide: { en: "{pn} [query]" }
  },

  onStart: async function ({ api, event, args, message }) {
    try {
      const query = args.join(" ");
      if (!query) return message.reply("Please enter a search query");

      const cfg = await axios.get(`${API_BASE}/api/links/botsearch`);
      const { apiKey, cx } = cfg.data;

      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cx}&key=${apiKey}`;

      message.reply("🔍 Searching...", async (err, info) => {
        try {
          const response = await axios.get(url);
          const results = response.data.items;
          if (!results?.length) return message.reply("No results found");

          let text = `Search Results for: "${query}"\n\n`;
          results.slice(0, 5).forEach((item, i) => {
            text += `${i + 1}. ${item.title}\n${item.link}\n\n`;
          });

          api.sendMessage(text, event.threadID);
          api.unsendMessage(info.messageID);
        } catch (error) {
          message.reply("Error performing search. API limit may be reached.");
        }
      });
    } catch (error) {
      message.reply("An error occurred while searching");
    }
  }
};
