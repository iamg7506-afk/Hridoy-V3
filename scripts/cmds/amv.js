const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "amv", version: "2.1", author: "HR ID OY",
    countDown: 5, role: 0,
    shortDescription: { en: "Search and send Anime AMV videos" },
    category: "Media", guide: { en: "{pn} [keyword]" }
  },
  onStart: async function ({ api, event, args, message }) {
    const config = (await axios.get(`${API_BASE}/api/links/amv`)).data;
    let keyword = args.join(" ").trim() || config.defaultKeyword;
    api.setMessageReaction("🎀", event.messageID, () => {}, true);
    const searching = await message.reply("🔎 Searching...\nPlease wait...");
    const { data } = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(keyword)}`);
    if (!data.success || !data.result) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      await message.unsend(searching.messageID);
      return message.reply("❌ | No AMV found.");
    }
    const info = data.result;
    await message.unsend(searching.messageID);
    api.setMessageReaction("✅", event.messageID, () => {}, true);
    return api.sendMessage({
      body: `╭━〔 🎬 Anime AMV 〕━╮\n🎥 Title: ${info.title}\n📦 Size: ${info.size}\n🔎 Search: ${data.keyword}\n━━━━━━━━━━━━━━\n✨ Enjoy your AMV!\n👑 Author: HR ID OY\n╰━━━━━━━━━━━━━━╯`,
      attachment: await global.utils.getStreamFromURL(info.download)
    }, event.threadID, event.messageID);
  }
};
