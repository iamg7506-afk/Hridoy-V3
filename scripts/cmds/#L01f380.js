const axios = require("axios");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports.config = {
  name: "🎀",
  version: "2.0.0",
  hasPermssion: 0,
  author: "HR ID OY",
  description: "Send a random 🎀 picture",
  category: "Image",
  Category: "Image",
  usages: "🎀",
  cooldowns: 3
};

module.exports.onStart = async function ({ api, event }) {
  try {
    const { data: cfg } = await axios.get(`${BASE}/api/images/ribbon_images`);
    const items = cfg.items || [];
    if (!items.length) throw new Error("No images configured.");

    const randomImage = items[Math.floor(Math.random() * items.length)];
    const response = await axios.get(randomImage, { responseType: "stream" });

    return api.sendMessage(
      { body: "🎀", attachment: response.data },
      event.threadID,
      event.messageID
    );
  } catch (error) {
    return api.sendMessage(
      "❌ ছবি পাঠাতে সমস্যা হয়েছে।",
      event.threadID,
      event.messageID
    );
  }
};
