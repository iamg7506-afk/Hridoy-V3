const axios = require("axios");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "tiktok",
    aliases: ["tiksearch", "tt"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search TikTok videos" },
    category: "Media",
    guide: { en: "{pn} <keyword>" }
  },

  onStart: async function ({ message, args, event, api }) {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const keyword = args.join(" ").trim();
      if (!keyword) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Please provide a keyword.\n\nExample:\ntt Zoro");
      }

      const { data: cfg } = await axios.get(`${BASE}/api/links/tiktok_toshiro`);

      const { data } = await axios.get(
        `${cfg.url}?${cfg.queryParam || "keyword"}=${encodeURIComponent(keyword)}`,
        { timeout: 15000 }
      );

      if (!data.success || !data.result?.video) {
        throw new Error("No video found");
      }

      const { video: videoUrl, title, author, duration } = data.result;

      const video = (await axios.get(videoUrl, { responseType: "stream", timeout: 20000 })).data;

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await message.reply({
        body: `╭━━━━━━━━━━━━╮
🎵 𝑻𝒊𝒌𝑻𝒐𝒌 𝑺𝒆𝒂𝒓𝒄𝒉
╰━━━━━━━━━━━━╯
🔍 𝗞𝗲𝘆𝘄𝗼𝗿𝗱: ${keyword}
🎬 𝗧𝗶𝘁𝗹𝗲: ${title}
👤 𝗖𝗿𝗲𝗮𝘁𝗼𝗿: ${author}
⏳ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: ${duration}s`,
        attachment: video
      });

    } catch (err) {
      console.error("TT Error:", err.response?.data || err.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply(`❌ Failed to search TikTok\nReason: ${err.response?.data?.message || err.message}`);
    }
  }
};
