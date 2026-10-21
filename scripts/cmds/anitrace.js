const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "anitrace", version: "2.1", role: 0, author: "HR ID OY", description: "Find anime from image", category: "Media", guide: "Reply to an image" },
  onStart: async function ({ message, event }) {
    if (!event.messageReply?.attachments?.length) return message.reply("❌ Please reply to an image!");
    const imgUrl = event.messageReply.attachments[0].url;
    const config = (await axios.get(`${API_BASE}/api/links/anitrace`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(imgUrl)}`);
    if (!res.data.result?.length) return message.reply("❌ No result found!");
    const data = res.data.result[0];
    const title = data.anilist?.title?.english || data.anilist?.title?.romaji || "Unknown";
    const episode = data.episode || "N/A";
    const similarity = (data.similarity * 100).toFixed(2);
    const msg = `🎌 Anime Found!\n\n📺 Title: ${title}\n🎬 Episode: ${episode}\n📊 Similarity: ${similarity}%`;
    if (data.video) return message.reply({ body: msg, attachment: await global.utils.getStreamFromURL(data.video) });
    if (data.image) return message.reply({ body: msg, attachment: await global.utils.getStreamFromURL(data.image) });
    return message.reply(msg);
  }
};
