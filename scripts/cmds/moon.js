const axios = require("axios");
const cheerio = require("cheerio");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "moon", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Today's moon phase", category: "Utility", guide: "{pn} [date: YYYY/MM/DD]" },
  onStart: async function ({ api, event, args, message }) {
    const config = (await axios.get(`${API_BASE}/api/links/moon`)).data;
    const date = args[0] || new Date().toISOString().split("T")[0].replace(/-/g, "/");
    try {
      const res = await axios.get(`${config.url}${date}/`, { headers: { "User-Agent": "Mozilla/5.0" } });
      const $ = cheerio.load(res.data);
      const phase = $(".moon-phase-name").first().text().trim() || "Unknown Phase";
      const illumination = $(".moon-illumination").first().text().trim() || "?";
      const rise = $(".moonrise").first().text().trim() || "?";
      const set = $(".moonset").first().text().trim() || "?";
      const phaseIndex = Math.floor(Math.random() * config.moonImages.length);
      const imageUrl = config.moonImages[phaseIndex];
      const body = `🌙 Moon Phase for ${date}\n\n🌕 Phase: ${phase}\n💡 Illumination: ${illumination}\n🌅 Moonrise: ${rise}\n🌇 Moonset: ${set}`;
      const img = await global.utils.getStreamFromURL(imageUrl);
      return api.sendMessage({ body, attachment: img }, event.threadID, event.messageID);
    } catch {
      const imageUrl = config.moonImages[Math.floor(Math.random() * config.moonImages.length)];
      const img = await global.utils.getStreamFromURL(imageUrl);
      return api.sendMessage({ body: `🌙 Moon phase for ${date}`, attachment: img }, event.threadID, event.messageID);
    }
  }
};
