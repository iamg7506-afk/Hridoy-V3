const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "hnekos";
module.exports = {
  config: { name: "hnekos", version: "2.2", author: "HR ID OY", role: 0, description: "High quality NSFW waifu", category: "NSFW", countDown: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const params = config.params || { IncludedTags: "waifu", IsNsfw: "true", OrderBy: "Random", PageSize: 1 };
    const res = await axios.get(config.url, { params, headers: { "Accept-Version": "v7", "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
    const url = res.data?.items?.[0]?.url;
    if (!url) throw new Error("No image found");
    const image = await axios.get(url, { responseType: "stream", timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" } });
    return api.sendMessage({ body: config.body || "✨ High Quality Waifu\n\n💗 Enjoy!", attachment: image.data }, event.threadID, event.messageID);
  }
};
