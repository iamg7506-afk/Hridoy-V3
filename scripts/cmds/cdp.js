const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "kpopdp", aliases: ["k-pop"], version: "2.1", author: "HR ID OY", description: "Random K-Pop Matching Couple DP", category: "FUN", countDown: 5, role: 0, guide: { en: "{pn} or {pn} list" } },
  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const config = (await axios.get(`${API_BASE}/api/links/cdp`)).data;
    if (args[0]?.toLowerCase() === "list") {
      const { data } = await axios.get(`${config.url}?type=list`, { timeout: 8000 });
      if (!data?.status) throw new Error();
      return api.sendMessage(`╭━━━〔 💕 〕━━━╮\n      𝗞-𝗣𝗢𝗣 𝗖𝗢𝗨𝗣𝗟𝗘\n━━━━━━━━━━━━━━━\n📦 Total: ${data.total_cdp}\n╰━━━〔 💖 〕━━━╯`, threadID, messageID);
    }
    api.setMessageReaction("🎀", messageID, () => {}, true);
    for (let i = 1; i <= 3; i++) {
      try {
        const { data } = await axios.get(config.url, { timeout: 10000 });
        if (!data?.pair?.boy || !data?.pair?.girl) throw new Error();
        const [boy, girl] = await Promise.all([
          axios.get(data.pair.boy, { responseType: "stream", timeout: 15000 }),
          axios.get(data.pair.girl, { responseType: "stream", timeout: 15000 })
        ]);
        await api.sendMessage({ body: `╭━━━〔 💕 〕━━━╮\n      𝗞-𝗣𝗢𝗣 𝗖𝗢𝗨𝗣𝗟𝗘\n━━━━━━━━━━━━━━━\n💞 Matching Couple DP\n╰━━━〔 💖 〕━━━╯`, attachment: [boy.data, girl.data] }, threadID);
        api.setMessageReaction("✅", messageID, () => {}, true); return;
      } catch { if (i===3) { api.setMessageReaction("❌", messageID, () => {}, true); return api.sendMessage("❌ | Failed to fetch Couple DP.", threadID, messageID); } await new Promise(r=>setTimeout(r,i*2000)); }
    }
  }
};
