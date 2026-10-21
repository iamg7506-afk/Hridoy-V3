const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "translate", aliases: ["tr", "tl"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Translate text", category: "Utility", guide: "{pn} <lang> <text>\nExample: {pn} bn Hello" },
  onStart: async function ({ message, args, event }) {
    if (args.length < 2) return message.reply("Usage: .translate <lang> <text>\nExample: .translate bn Hello World");
    const to = args[0];
    const text = args.slice(1).join(" ");
    const config = (await axios.get(`${API_BASE}/api/links/translate`)).data;
    const res = await axios.get(`${config.url}?text=${encodeURIComponent(text)}&to=${to}`);
    if (!res.data?.[config.responseKey]) return message.reply("❌ Translation failed.");
    return message.reply(`🌐 Translation (${res.data[config.fromKey] || "?"} → ${res.data[config.toKey] || to}):\n\n${res.data[config.responseKey]}`);
  }
};
