const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "hinata";
module.exports = {
  config: { name: "hinata", version: "2.1", author: "HR ID OY", countDown: 10, role: 0, shortDescription: "Hinata Video", category: "Media", guide: { en: "{pn} | {pn} <keyword>" } },
  onStart: async function ({ api, event, args }) {
    const EMOJIS = ["🎀","💖","✨","🌸","💫","💝","🩷","🌷"];
    const EMOJI = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    let keyword = config.defaultKeyword || "hinata";
    if (args.length) keyword = `hinata ${args.join(" ")}`;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(keyword)}`, { timeout: 15000 });
    if (!Array.isArray(res.data) || !res.data.length) return api.sendMessage("𝐤𝐨𝐧𝐨 𝐯𝐢𝐝𝐞𝐨 𝐩𝐚𝐰𝐚 𝐣𝐚𝐲 𝐧𝐚𝐢 ❌", event.threadID, event.messageID);
    const data = res.data[Math.floor(Math.random() * res.data.length)];
    if (!data[config.responseKey]) return api.sendMessage("❌ 𝐘𝐨𝐮𝐫 𝐛𝐨𝐭 𝐢𝐬 𝐭𝐞𝐦𝐩𝐨𝐫𝐚𝐫𝐢𝐥𝐲 𝐮𝐧𝐬𝐞𝐧𝐝 𝐛𝐥𝐨𝐜𝐤", event.threadID, event.messageID);
    try {
      await api.sendMessage({ body: `${EMOJI}𝐇𝐢𝐧𝐚𝐭𝐚 𝐕𝐢𝐝𝐞𝐨\n⏱ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧: ${data.duration || "?"}s`, attachment: await global.utils.getStreamFromURL(data[config.responseKey]) }, event.threadID, event.messageID);
    } catch { api.sendMessage("❌ 𝐮𝐧𝐬𝐞𝐧𝐝 𝐛𝐥𝐨𝐜𝐤", event.threadID, event.messageID); }
  }
};
