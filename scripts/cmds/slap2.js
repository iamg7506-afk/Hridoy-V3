const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "slap2", version: "2.2", author: "HR ID OY", role: 0, shortDescription: "Slap a user with gif", category: "Tag Fun", guide: "{pn}" },
  onStart: async function ({ message, event, api }) {
    let targetID, targetName;
    if (Object.keys(event.mentions || {}).length > 0) { targetID = Object.keys(event.mentions)[0]; targetName = event.mentions[targetID]; }
    else if (event.type === "message_reply" && event.messageReply) { targetID = event.messageReply.senderID; const info = await api.getUserInfo(targetID); targetName = info[targetID]?.name || "User"; }
    if (!targetID) return message.reply("❌ Please mention or reply to someone.");
    const config = (await axios.get(`${API_BASE}/api/audio/slap2`, { timeout: 10000 })).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    try {
      const res = await axios({ method: "GET", url, responseType: "stream", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
      const body = (config.body || "{target} you got slap 👋💥").replace("{target}", `@${targetName}`);
      return message.reply({ body, mentions: [{ id: targetID, tag: `@${targetName}` }], attachment: res.data });
    } catch (err) { return message.reply("❌ GIF load failed."); }
  }
};
