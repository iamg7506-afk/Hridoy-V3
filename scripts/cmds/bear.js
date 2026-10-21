const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "bear",
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Random bear image" },
    longDescription: { en: "Sends a random bear image" },
    category: "Image",
    guide: { en: "+bear" }
  },

  onStart: async function({ message }) {
    try {
      const res = await axios.get(`${API_BASE}/api/links/bear`);
      const imgUrl = res.data?.url;
      if (!imgUrl) throw new Error("No URL");

      const stream = await global.utils.getStreamFromURL(imgUrl);
      return message.reply({ body: "Here's your Bear image 🐻", attachment: stream });
    } catch {
      message.reply("❌ Failed to get bear image.");
    }
  }
};
