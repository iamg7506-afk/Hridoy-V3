const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "bblur",
    version: "2.0.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Random Anime Pic",
    longDescription: "Send random anime picture from API list",
    category: "Image",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    try {
      const res = await axios.get(`${API_BASE}/api/links/bblur_images`);
      const items = res.data?.items;
      if (!Array.isArray(items) || !items.length) throw new Error("No images");

      const randomLink = items[Math.floor(Math.random() * items.length)];
      const stream = await global.utils.getStreamFromURL(randomLink);

      return message.reply({
        body: "🌸 𝗔𝗻𝗶𝗺𝗲 𝗣𝗶𝗰 🌸",
        attachment: stream
      });
    } catch (error) {
      message.reply("❌ Something went wrong!");
    }
  }
};
