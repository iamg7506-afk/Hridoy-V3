const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "tiktok2",
    aliases: ["tt2", "tik2"],
    version: "3.0",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    shortDescription: "Search random TikTok video",
    longDescription: "Search TikTok by keyword and send a random video.",
    category: "Media",
    guide: { en: "{pn} <keyword>" }
  },

  onStart: async function ({ api, event, args }) {
    const keyword = args.join(" ").trim();

    if (!keyword) {
      return api.sendMessage(
        "🎀 | Please enter a TikTok search keyword.\n\nExample:\n.tiktok2 anime edit",
        event.threadID,
        event.messageID
      );
    }

    let loading;

    try {
      // Same underlying API as anisr — reuse its config from the gateway
      const { data: cfg } = await axios.get(`${BASE}/api/links/anisr`);

      loading = await api.sendMessage(
        `🔎 | Searching TikTok...\n\n🎀 Keyword: ${keyword}`,
        event.threadID
      );

      const response = await axios.get(cfg.url, {
        params: { [cfg.queryParam || "keyword"]: keyword, count: 20, cursor: 0, publish_time: 0, sort_by: 0 },
        headers: { [cfg.authHeader || "X-Api-Key"]: cfg.apiKey },
        timeout: 30000
      });

      const videos = response.data?.videos;

      if (!Array.isArray(videos) || videos.length === 0) {
        if (loading?.messageID) { try { await api.unsendMessage(loading.messageID); } catch {} }
        return api.sendMessage(`❌ | No TikTok videos found.\n\n🔎 Keyword: ${keyword}`, event.threadID, event.messageID);
      }

      const validVideos = videos.filter(v => v?.play || v?.wmplay);
      if (validVideos.length === 0) throw new Error("No playable video found in search results.");

      const video = validVideos[Math.floor(Math.random() * validVideos.length)];
      const videoURL = video.play || video.wmplay;

      await api.editMessage(`⬇️ | Downloading video...\n\n🎀 Keyword: ${keyword}`, loading.messageID);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `tiktok2_${Date.now()}_${Math.floor(Math.random() * 99999)}.mp4`);

      const videoResponse = await axios.get(videoURL, {
        responseType: "stream",
        timeout: 60000,
        maxContentLength: 80 * 1024 * 1024,
        maxBodyLength: 80 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36" }
      });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        videoResponse.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
        videoResponse.data.on("error", reject);
      });

      const stat = await fs.stat(filePath);
      if (!stat.size || stat.size < 10000) throw new Error("Downloaded video is empty or invalid.");

      await api.sendMessage(
        {
          body:
            `╭────── 🎀 ──────╮\n` +
            `   𝑯𝑬𝑹𝑬'𝑺 𝒀𝑶𝑼𝑹\n` +
            `    𝑽𝑰𝑫𝑬𝑶 𝑩𝑨𝑩𝒀 💗\n` +
            `╰────── 🎀 ──────╯\n\n` +
            `🔎 𝑲𝒆𝒚𝒘𝒐𝒓𝒅 : ${keyword}\n` +
            `👤 𝑨𝒖𝒕𝒉𝒐𝒓 : HR ID OY`,
          attachment: fs.createReadStream(filePath)
        },
        event.threadID
      );

      await fs.remove(filePath);
      if (loading?.messageID) { try { await api.unsendMessage(loading.messageID); } catch {} }

    } catch (error) {
      console.error("[TIKTOK2 ERROR]", error.response?.data || error.message);
      if (loading?.messageID) { try { await api.unsendMessage(loading.messageID); } catch {} }

      let errorMessage = "Something went wrong.";
      if (error.response?.status === 401) errorMessage = "Invalid TikTok API key.";
      else if (error.response?.status === 403) errorMessage = "TikTok API access denied.";
      else if (error.response?.status === 429) errorMessage = "TikTok API rate limit reached.";
      else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") errorMessage = "TikTok API request timed out.";
      else if (error.message) errorMessage = error.message;

      return api.sendMessage(
        `❌ | TikTok Error\n\n🔎 Keyword: ${keyword}\n⚠️ ${errorMessage}`,
        event.threadID,
        event.messageID
      );
    }
  }
};
