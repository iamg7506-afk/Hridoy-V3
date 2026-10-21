const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "sexvid", aliases: ["sex"], version: "2.1", author: "HR ID OY", countDown: 30, role: 2, shortDescription: "NSFW video", category: "NSFW", guide: "{p}{n}" },
  sentVideos: [],
  onStart: async function ({ api, event, message }) {
    const loadingMessage = await message.reply({ body: "Tham video dicchi ektu Dara 😏" });
    const config = (await axios.get(`${API_BASE}/api/audio/sexvid`)).data;
    let available = config.ids.filter(v => !this.sentVideos.includes(v));
    if (!available.length) { this.sentVideos = []; available = config.ids; }
    const url = available[Math.floor(Math.random() * available.length)];
    this.sentVideos.push(url);
    message.reply({ body: config.body, attachment: await global.utils.getStreamFromURL(url) });
    setTimeout(() => { api.unsendMessage(loadingMessage.messageID); }, 50000);
  }
};
