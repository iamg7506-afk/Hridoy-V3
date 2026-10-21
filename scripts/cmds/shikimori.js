const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "shikimori", version: "2.2", author: "HR ID OY", countDown: 10, role: 0, shortDescription: "Shikimori Video", category: "Media", guide: { en: "{pn} | {pn} <keyword>" } },
  onStart: async function ({ api, event, args }) {
    const EMOJIS = ["🎀","💖","✨","🌸","💫","💝","🩷","🌷"];
    const EMOJI = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const config = (await axios.get(`${API_BASE}/api/links/shikimori`)).data;
    let keyword = config.defaultKeyword || "shikimori";
    if (args.length) keyword = `shikimori ${args.join(" ")}`;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(keyword)}`, { timeout: 15000 });
    if (!Array.isArray(res.data) || !res.data.length) return api.sendMessage("𝐤𝐨𝐧𝐨 𝐯𝐢𝐝𝐞𝐨 𝐩𝐚𝐰𝐚 𝐣𝐚𝐲 𝐧𝐚𝐢 ❌", event.threadID, event.messageID);
    const data = res.data[Math.floor(Math.random() * res.data.length)];
    if (!data[config.responseKey]) return api.sendMessage("❌ 𝐮𝐧𝐬𝐞𝐧𝐝 𝐛𝐥𝐨𝐜𝐤", event.threadID, event.messageID);
    try {
      await api.sendMessage({ body: `${EMOJI}𝐒𝐡𝐢𝐤𝐢𝐦𝐨𝐫𝐢 𝐕𝐢𝐝𝐞𝐨\n⏱ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧: ${data.duration || "?"}s`, attachment: await global.utils.getStreamFromURL(data[config.responseKey]) }, event.threadID, event.messageID);
    } catch { api.sendMessage("❌ 𝐛𝐥𝐨𝐜𝐤𝐞𝐝", event.threadID, event.messageID); }
  }
};
