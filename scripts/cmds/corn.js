const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "corn",
    aliases: ["kda"],
    version: "3.1",
    author: "HR ID OY",
    countDown: 30,
    role: 2,
    shortDescription: "",
    longDescription: "get kanda/p***n video hilake sojaa",
    category: "NSFW",
    guide: "{p}{n}",
  },

  sentVideos: [],

  onStart: async function ({ api, event, message }) {
    const loadingMessage = await message.reply({ body: "kanda aaudaixa... ekxin parkhi muji! 🤡" });

    try {
      const res = await axios.get(`${API_BASE}/api/audio/corn`);
      const { baseUrl, ids } = res.data;
      if (!ids?.length) throw new Error("No video list");

      const links = ids.map(id => `${baseUrl}${id}`);
      const available = links.filter(v => !this.sentVideos.includes(v));
      if (!available.length) this.sentVideos = [];

      const randomVideo = available[Math.floor(Math.random() * available.length)];
      this.sentVideos.push(randomVideo);

      message.reply({
        body: "xolera bas aba 🤡",
        attachment: await global.utils.getStreamFromURL(randomVideo),
      });

      setTimeout(() => api.unsendMessage(loadingMessage.messageID), 50000);
    } catch (err) {
      message.reply("❌ Video load hoilo na, abar try koro.");
    }
  },
};
