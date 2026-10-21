const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "quran", aliases: ["surah"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Full Surah Arabic + Bangla", category: "Utility", guide: { en: "{pn} <surahNumber>" } },
  onStart: async function ({ api, event, args }) {
    const config = (await axios.get(`${API_BASE}/api/links/quran`)).data;
    let surahNo = parseInt(args[0]);
    if (!surahNo || isNaN(surahNo) || surahNo < 1 || surahNo > config.totalSurah)
      surahNo = Math.floor(Math.random() * config.totalSurah) + 1;
    const url = `${config.url}${surahNo}?${config.queryParam}=${config.defaultLang}`;
    const res = await axios.get(url);
    const data = res.data;
    if (!data?.verses) return api.sendMessage("❌ | No data found.", event.threadID);
    let header = `📖 সূরা: ${data.surahName} (#${data.surahNo})\n\n`;
    let arabicText = "", banglaText = "";
    data.verses.forEach(a => { arabicText += `${a.text}\n`; banglaText += `${a.translation}\n`; });
    const fullText = `${header}🕌 Arabic:\n${arabicText}\n📝 Bangla Translation:\n${banglaText}`;
    const chunkSize = 1800;
    for (let i = 0; i < fullText.length; i += chunkSize)
      await api.sendMessage(fullText.substring(i, i + chunkSize), event.threadID);
  }
};
