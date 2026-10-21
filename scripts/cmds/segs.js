const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "segs", aliases: ["segsv","sv"], version: "2.1", author: "HR ID OY", countDown: 30, role: 2, description: "Premium adult content", category: "NSFW", guide: { en: "{pn}" } },
  onStart: async function ({ event, message, api }) {
    api.setMessageReaction("🤫", event.messageID, () => {}, true);
    const loadingMsg = await message.reply("📥 2 minutes video is loading... Please wait ⏳");
    const config = (await axios.get(`${API_BASE}/api/audio/segs`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    setTimeout(async () => {
      try {
        if (loadingMsg?.messageID) api.unsendMessage(loadingMsg.messageID);
        await message.reply({ body: config.body, attachment: await global.utils.getStreamFromURL(url) });
        api.setMessageReaction("🥵", event.messageID, () => {}, true);
      } catch (e) { message.reply("An error occurred while sending the video."); }
    }, 10000);
  }
};
