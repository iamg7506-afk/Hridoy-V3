const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "pussy3",
    aliases: ["18+"],
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 2,
    shortDescription: "NSFW image",
    category: "NSFW",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    try {
      const res = await axios.get(`${API_BASE}/api/audio/zpussy`);
      const { ids, body } = res.data;
      const img = ids[Math.floor(Math.random() * ids.length)];

      return message.reply({
        body,
        attachment: await global.utils.getStreamFromURL(img)
      });
    } catch (err) {
      return message.reply("❌ Error: " + err.message);
    }
  }
};
