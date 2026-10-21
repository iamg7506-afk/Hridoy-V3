const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "liner", version: "2.1", author: "HR ID OY", role: 0, shortDescription: "Liner AI assistant", category: "AI", guide: { en: "{p}liner [prompt]" } },
  onStart: async function ({ message, event, args }) {
    const prompt = args.join(" ").trim();
    if (!prompt) return message.reply("Please provide a prompt.");
    const config = (await axios.get(`${API_BASE}/api/links/liner`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(prompt)}`);
    if (res.data?.[config.responseKey]) {
      message.reply(res.data[config.responseKey], (r, s) => {
        global.GoatBot.onReply.set(s.messageID, { commandName: "liner", uid: event.senderID });
      });
    } else message.reply("No response from Liner.");
  },
  onReply: async function ({ message, event, args }) {
    const prompt = (event.body || "").trim();
    if (!prompt) return;
    const config = (await axios.get(`${API_BASE}/api/links/liner`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(prompt)}`);
    if (res.data?.[config.responseKey]) message.reply(res.data[config.responseKey]);
    else message.reply("No response from Liner.");
  }
};
