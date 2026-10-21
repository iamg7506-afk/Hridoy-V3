const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "alya";

module.exports = {
  config: {
    name: "alya",
    version: "2.1",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    shortDescription: "alya Video",
    longDescription: "alya Video",
    category: "Media",
    guide: { en: "{pn} | {pn} <keyword>" }
  },

  onStart: async function ({ api, event, args }) {
    const EMOJIS = ["🎀","💖","✨","🌸","💫","💝","🩷","🌷"];
    const EMOJI = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const FONT = {
      title: `${EMOJI}𝐀𝐥𝐲𝐚 𝐕𝐢𝐝𝐞𝐨`,
      notFound: "𝐤𝐨𝐧𝐨 𝐯𝐢𝐝𝐞𝐨 𝐩𝐚𝐰𝐚 𝐣𝐚𝐲 𝐧𝐚𝐢 ❌",
      blocked: "❌ 𝐘𝐨𝐮𝐫 𝐛𝐨𝐭 𝐢𝐬 𝐭𝐞𝐦𝐩𝐨𝐫𝐚𝐫𝐢𝐥𝐲 𝐮𝐧𝐬𝐞𝐧𝐝 𝐛𝐥𝐨𝐜𝐤"
    };

    try {
      const configRes = await axios.get(`${API_BASE}/api/links/${CMD_NAME}`);
      const config = configRes.data;

      let keyword = config.defaultKeyword || "alya";
      if (args.length) keyword = `alya ${args.join(" ")}`;

      const res = await axios.get(
        `${config.url}?${config.queryParam}=${encodeURIComponent(keyword)}`,
        { timeout: 15000 }
      );

      if (!Array.isArray(res.data) || res.data.length === 0)
        return api.sendMessage(FONT.notFound, event.threadID, event.messageID);

      const data = res.data[Math.floor(Math.random() * res.data.length)];
      if (!data[config.responseKey])
        return api.sendMessage(FONT.blocked, event.threadID, event.messageID);

      try {
        await api.sendMessage({
          body: `${FONT.title}\n⏱ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧: ${data.duration || "?"}s`,
          attachment: await global.utils.getStreamFromURL(data[config.responseKey])
        }, event.threadID, event.messageID);
      } catch {
        api.sendMessage(FONT.blocked, event.threadID, event.messageID);
      }

    } catch {
      api.sendMessage(FONT.blocked, event.threadID, event.messageID);
    }
  }
};
