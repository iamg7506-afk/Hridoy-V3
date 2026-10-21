const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";

async function fetchAttachment(url, filename) {
  const res = await axios.get(url, { responseType: "stream", timeout: 90000, validateStatus: s => s === 200 });
  res.data.path = filename; return res.data;
}

module.exports = {
  config: { name: "pin", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Search Pinterest images/videos", category: "Image", guide: { en: "{pn} <query> [video|image] [-N]" } },
  onStart: async function ({ api, event, args, message }) {
    if (!args.length) return message.reply("⚠️ Usage: !pin <query> [video|image] [-N]");
    let mode = "image", num = 10; const queryParts = [];
    for (const arg of args) {
      if (arg === "video" || arg === "image") mode = arg;
      else if (/^-\d+$/.test(arg)) num = Math.min(10, Math.max(1, parseInt(arg.slice(1), 10)));
      else queryParts.push(arg);
    }
    const query = queryParts.join(" ").trim();
    if (!query) return message.reply("⚠️ Please provide a search query.");
    const config = (await axios.get(`${API_BASE}/api/links/pin`)).data;
    const BASE_URL = config.url;
    const waitMsg = await message.reply(`🔍 Searching Pinterest for "${query}" (${mode}, ${num})...`);
    try {
      const { data } = await axios.get(`${BASE_URL}${config.searchPath}`, { params: { q: mode === "video" ? `${query} video` : query, mode, num }, timeout: 60000 });
      const results = Array.isArray(data) ? data : data.results;
      if (!results?.length) return message.reply(`❌ No ${mode} results found for "${query}".`);
      if (mode === "image") {
        const attachments = [];
        for (const item of results) { try { attachments.push(await fetchAttachment(item.download_url, `${item.id}.jpg`)); } catch {} }
        if (!attachments.length) return message.reply("❌ Failed to fetch images.");
        return message.reply({ body: `✅ Found ${attachments.length} image(s) for "${query}"`, attachment: attachments });
      }
      if (mode === "video" && (num === 1 || results.length === 1)) {
        const item = results[0];
        const dlUrl = item.download_url.startsWith("http") ? item.download_url : `${BASE_URL}${item.download_url}`;
        const attachment = await fetchAttachment(dlUrl, `${item.id}.mp4`);
        return message.reply({ attachment });
      }
      const thumbs = []; const list = [];
      results.forEach((item, i) => { const dur = item.duration_ms ? ` (${Math.round(item.duration_ms/1000)}s)` : ""; list.push(`${i+1}.${dur} ${item.alt||"No title"}`.slice(0,80)); });
      for (const item of results) { try { thumbs.push(await fetchAttachment(item.thumbnail, `${item.id}.jpg`)); } catch {} }
      if (!thumbs.length) return message.reply("❌ Failed to load thumbnails.");
      const pickMsg = await message.reply({ body: `🎬 Found ${thumbs.length} video(s) for "${query}"\n\n${list.join("\n")}\n\n👉 Reply with a number (1-${thumbs.length}) to download`, attachment: thumbs });
      global.GoatBot.onReply.set(pickMsg.messageID, { commandName: "pin", messageID: pickMsg.messageID, author: event.senderID, results, BASE_URL });
    } finally { try { api.unsendMessage(waitMsg.messageID); } catch {} }
  },
  onReply: async function ({ api, event, Reply, message }) {
    if (event.senderID !== Reply.author) return;
    const choice = parseInt(event.body?.trim(), 10);
    const item = Reply.results[choice - 1];
    if (!choice || !item) return message.reply(`⚠️ Reply with a number between 1 and ${Reply.results.length}.`);
    global.GoatBot.onReply.delete(Reply.messageID);
    const waitMsg = await message.reply(`⬇️ Downloading video ${choice}...`);
    try {
      const dlUrl = item.download_url.startsWith("http") ? item.download_url : `${Reply.BASE_URL}${item.download_url}`;
      const attachment = await fetchAttachment(dlUrl, `${item.id}.mp4`);
      await message.reply({ attachment });
    } catch (e) { await message.reply(`❌ Failed to download video ${choice}.\nReason: ${e.message}`); }
    finally { try { api.unsendMessage(waitMsg.messageID); } catch {} }
  }
};
