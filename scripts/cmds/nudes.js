const API_BASE = "https://hridoy-api.vercel.app";
const axios = require("axios");
module.exports = {
  config: { name: "nudes", aliases: ["nude"], version: "2.1", author: "HR ID OY", countDown: 5, role: 2, shortDescription: "send you a girl photos", category: "NSFW", guide: "{pn}" },
  onStart: async function ({ message }) {
    const config = (await axios.get(`${API_BASE}/api/audio/nudes`)).data;
    const img = config.ids[Math.floor(Math.random() * config.ids.length)];
    message.send({ body: config.body, attachment: await global.utils.getStreamFromURL(img) });
  }
};
