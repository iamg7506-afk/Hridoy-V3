const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "news", aliases: ["headline"], version: "2.1", role: 0, author: "HR ID OY", description: "Get latest news", category: "Utility", guide: "{pn} [topic]" },
  onStart: async function ({ message, args }) {
    const config = (await axios.get(`${API_BASE}/api/links/news`)).data;
    const topic = args.join(" ") || config.defaultTopic;
    const url = `${config.url}?${config.queryParam}=${encodeURIComponent(topic)}&lang=en&max=10&token=${config.apiKey}`;
    const res = await axios.get(url);
    if (!res.data.articles.length) return message.reply("❌ No news found!");
    const news = res.data.articles[Math.floor(Math.random() * res.data.articles.length)];
    const msg = `📰 ${news.title}\n\n${news.description || "No description"}\n\n🌐 Source: ${news.source.name}\n🔗 ${news.url}`;
    if (news.image) return message.reply({ body: msg, attachment: await global.utils.getStreamFromURL(news.image) });
    return message.reply(msg);
  }
};
