const axios = require("axios");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "unisr",
    aliases: ["unisearch", "unsr"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search universal videos" },
    category: "Media",
    guide: { en: "{pn} <keyword>" }
  },

  onStart: async function ({ message, args, event, api }) {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const keyword = args.join(" ").trim();
      if (!keyword) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Please provide a keyword.\n\nExample:\nunisr Zoro");
      }

      // Same underlying API as tiktok.js — reuse its config from the gateway
      const { data: cfg } = await axios.get(`${BASE}/api/links/tiktok_toshiro`);

      const { data } = await axios.get(
        `${cfg.url}?${cfg.queryParam || "keyword"}=${encodeURIComponent(keyword)}`,
        { timeout: 15000 }
      );

      if (!data.success || !data.result?.video) {
        throw new Error("No video found");
      }

      const { video: videoUrl } = data.result;
      const video = (await axios.get(videoUrl, { responseType: "stream", timeout: 20000 })).data;

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      return message.reply({
        body: `\n🔍 𝗞𝗲𝘆𝘄𝗼𝗿𝗱: ${keyword}`,
        attachment: video
      });

    } catch (err) {
      console.error("unisr Error:", err.response?.data || err.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Failed to search video\nReason: ${err.response?.data?.message || err.message}`);
    }
  }
};
