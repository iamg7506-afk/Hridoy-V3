const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "ffinfo";

module.exports = {
  config: {
    name: "ffinfo", aliases: ["freefireinfo", "ffstats"], version: "2.2",
    author: "HR ID OY", role: 0, description: "Free Fire player info", category: "Game",
    guide: "{p}ffinfo <uid>"
  },
  onStart: async function ({ api, event, args }) {
    const uid = args[0];
    if (!uid) return api.sendMessage("⚠️ Please provide a FF UID\nExample: ffinfo 3060644273", event.threadID, event.messageID);

    let wait;
    try {
      wait = await api.sendMessage("⏳ Fetching...", event.threadID);
      const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`, { timeout: 15000 })).data;
      const res = await axios.get(`${config.url}?${config.queryParam || "uid"}=${encodeURIComponent(uid)}`, { timeout: 15000 });
      const data = res.data;

      if (!data?.basicInfo) {
        return api.editMessage("❌ Invalid UID or the Free Fire info API is currently unavailable.", wait.messageID);
      }

      const b = data.basicInfo;
      const clan = data.clanBasicInfo || {};
      const msg = `🎮 Free Fire Player Info\n━━━━━━━━━━━━━━\n👤 Name: ${b.nickname || "?"}\n🆔 UID: ${b.accountId || uid}\n🌍 Region: ${b.region || "?"}\n⭐ Level: ${b.level || "?"}\n❤️ Likes: ${b.liked || "?"}\n🏆 Rank: ${b.rank || "?"}\n🛡️ Guild: ${clan.clanName || "None"}`;
      await api.editMessage(msg, wait.messageID);
    } catch (err) {
      console.error("[ffinfo] error:", err?.message || err);
      const errMsg = "❌ Couldn't fetch player info right now. The FF info service may be down — please try again later.";
      if (wait?.messageID) return api.editMessage(errMsg, wait.messageID);
      return api.sendMessage(errMsg, event.threadID, event.messageID);
    }
  }
};
