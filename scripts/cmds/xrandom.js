const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";

const QUALITY_EMOJI = (q = "") => q.includes("1080") ? "🔵" : q.includes("720") ? "🟢" : q.includes("480") ? "🟡" : "🔴";
const truncate = (str = "", max = 60) => str.length > max ? str.slice(0, max) + "…" : str;
const ln = () => "━".repeat(26);
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const SORTS = ["relevance", "views", "rating", "date"];

module.exports = {
  config: { name: "xrandom", aliases: ["xr"], version: "2.1", author: "HR ID OY", countDown: 20, role: 2, shortDescription: "Search & instantly download a random NSFW video", category: "NSFW", guide: "{pn} [keyword]" },
  onStart: async function ({ event, api, args }) {
    const { threadID, messageID } = event;
    if (!args[0]) return api.sendMessage(`🎲 Usage: xrandom [keyword]\n\nExamples:\n  xrandom bangla\n  xrandom anime\n⚡ Instantly picks & downloads a random video!`, threadID, messageID);
    const query = args.join(" ").trim();
    // API config থেকে base URL নেওয়া
    const config = (await axios.get(`${API_BASE}/api/links/xncdi`)).data;
    const BASE = config.url;
    const loadInfo = await new Promise(r => api.sendMessage(`🎲 Finding random "${query}" video...\n⏳ Please wait...`, threadID, (e, i) => r(i)));
    try {
      const randomSort = rand(SORTS);
      const randomPage = Math.floor(Math.random() * 5) + 1;
      const { data: searchData } = await axios.get(`${BASE}${config.searchPath}`, { params: { [config.searchParam]: query, page: randomPage, sort: randomSort }, timeout: 20000, headers: { "Referer": "https://www.xnxx.com/", "User-Agent": "Mozilla/5.0" } });
      let results = searchData.results || [];
      if (!results.length) {
        const { data: fallback } = await axios.get(`${BASE}${config.searchPath}`, { params: { [config.searchParam]: query, page: 1, sort: "relevance" }, timeout: 20000 });
        results = fallback.results || [];
      }
      if (!results.length) return api.editMessage(`❌ No results for "${query}"! Try a different keyword.`, loadInfo.messageID);
      const picked = rand(results);
      let videoUrl = (picked.url || "").trim();
      if (!videoUrl.startsWith("http")) videoUrl = "https://" + videoUrl;
      api.editMessage(`🎲 Picked: ${truncate(picked.title, 50)}\n⏳ Extracting source...`, loadInfo.messageID);
      const { data } = await axios.get(`${BASE}${config.videoSourcePath}`, { params: { url: videoUrl }, timeout: 30000 });
      const streamUrl = data.best || data.hq || data.lq;
      if (!streamUrl) return api.editMessage(`❌ No stream URL found!`, loadInfo.messageID);
      api.editMessage(`🎲 Picked: ${truncate(data.title || picked.title, 45)}\n${QUALITY_EMOJI(data.quality)}${data.quality || "?"} │ ⏱ ${data.duration || "?"}\n📥 Downloading...`, loadInfo.messageID);
      const stream = (await axios.get(streamUrl, { responseType: "stream", timeout: 120000, headers: { "Referer": "https://www.xnxx.com/", "User-Agent": "Mozilla/5.0" } })).data;
      const infoText = `✅ 𝗥𝗮𝗻𝗱𝗼𝗺 𝗩𝗶𝗱𝗲𝗼\n${ln()}\n🎬 ${truncate(data.title || picked.title, 60)}\n⏱ ${data.duration || "?"} │ ${QUALITY_EMOJI(data.quality)}${data.quality || "?"}\n${ln()}`;
      await api.sendMessage({ body: infoText, attachment: stream }, threadID, messageID);
      api.unsendMessage(loadInfo.messageID);
    } catch (err) {
      api.editMessage(`❌ Error: ${err.message}`, loadInfo.messageID);
    }
  }
};
