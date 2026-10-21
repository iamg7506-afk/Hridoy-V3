const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "lyrics", aliases: ["songlyrics"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Get song lyrics", category: "AI", guide: "{pn} [song name]" },
  onStart: async function ({ api, event, args }) {
    const songName = args.join(" ");
    if (!songName) return api.sendMessage("╭─❍\n│ Please provide a song name!\n╰───────────⟡", event.threadID, event.messageID);
    const waitMsg = await api.sendMessage(`🔍 | Searching lyrics for: ${songName}...`, event.threadID, event.messageID);
    const config = (await axios.get(`${API_BASE}/api/links/lyrics`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(songName)}`);
    if (res.data.status && res.data.data) {
      const { title, artist, lyrics } = res.data.data;
      return api.editMessage(`╭───────❍\n│  『 𝗦𝗢𝗡𝗚 𝗟𝗬𝗥𝗜𝗖𝗦 』\n╰───────────⟡\n🎵 𝗧𝗶𝘁𝗹𝗲  : ${title}\n👤 𝗔𝗿𝘁𝗶𝘀𝘁 : ${artist}\n\n📜 𝗟𝘆𝗿𝗶𝗰𝘀 :\n━━━━━━━━━━━━━━━━━━\n${lyrics}\n━━━━━━━━━━━━━━━━━━`, waitMsg.messageID);
    }
    return api.editMessage(`✕ Could not find lyrics for "${songName}"!`, waitMsg.messageID);
  }
};
