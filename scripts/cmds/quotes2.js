const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "quotes2", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: { en: "Random Kanye West quote" }, category: "AI", guide: { en: ".quotes2" } },
  onStart: async function({ message }) {
    const config = (await axios.get(`${API_BASE}/api/links/quotes2`)).data;
    const res = await axios.get(config.url);
    const quote = res.data[config.responseKey];
    message.reply(`${config.prefix}${quote}"`);
  }
};
