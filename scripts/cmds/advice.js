const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "advice";

module.exports = {
  config: {
    name: "advice",
    version: "2.2",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Random advice" },
    longDescription: { en: "Get a random piece of advice" },
    category: "AI",
    guide: { en: ".advice" }
  },

  onStart: async function({ message }) {
    try {
      const configRes = await axios.get(`${API_BASE}/api/links/${CMD_NAME}`);
      const config = configRes.data;

      const externalUrl = config.url;
      const responseKey = config.responseKey; 
      const prefix      = config.prefix;

      const res = await axios.get(externalUrl);

      const value = responseKey
        .split(".")
        .reduce((obj, key) => obj?.[key], res.data);

      if (!value) throw new Error("Response value পাওয়া যায়নি");

      message.reply(`${prefix}${value}"`);

    } catch (e) {
      console.error("Advice error:", e.message);
      message.reply("𝗔𝗱𝘃𝗶𝗰𝗲 𝗳𝗿𝗼𝗺 𝗛𝗥 𝗜𝗗 𝗢𝗬: -");
    }
  }
};
