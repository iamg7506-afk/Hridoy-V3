const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "anihot", version: "2.1", author: "HR ID OY",
    countDown: 5, role: 0,
    description: { en: "𝐆𝐞𝐭 𝐑𝐚𝐧𝐝𝐨𝐦 𝐀𝐧𝐢𝐦𝐞 𝐇𝐨𝐭 𝐈𝐦𝐚𝐠𝐞" },
    category: "NSFW", guide: { en: "{pn}" }
  },
  onStart: async function ({ message }) {
    const config = (await axios.get(`${API_BASE}/api/links/anihot`)).data;
    const res = await axios.get(config.url, { responseType: "stream" });
    return message.reply({ body: config.body, attachment: res.data });
  }
};
