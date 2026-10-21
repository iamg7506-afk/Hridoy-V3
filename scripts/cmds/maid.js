const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "maid", version: "2.1", author: "HR ID OY", description: "Random maid anime image", category: "Image", cooldowns: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/maid`)).data;
    const res = await axios.get(config.url, { timeout: 15000 });
    const url = res.data?.items?.[0]?.url;
    if (!url) return api.sendMessage("❌ Maid image পাওয়া যায়নি", event.threadID, event.messageID);
    const img = await axios.get(url, { responseType: "stream" });
    return api.sendMessage({ body: config.body || "💮 Maid Image", attachment: img.data }, event.threadID, event.messageID);
  }
};
