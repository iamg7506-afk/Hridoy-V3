const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "hentai";
module.exports = {
  config: { name: "hentai", version: "2.1", author: "HR ID OY", role: 0, description: "Random hentai image", category: "NSFW", countDown: 5 },
  onStart: async function ({ api, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const params = config.params || { IncludedTags: "hentai", IsNsfw: "true", OrderBy: "Random", PageSize: 1 };
    const res = await axios.get(config.url, { params, headers: { "Accept-Version": "v7", "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
    const imageUrl = res.data?.items?.[0]?.url;
    if (!imageUrl) throw new Error("No image returned");
    const image = await axios.get(imageUrl, { responseType: "stream", timeout: 30000 });
    return api.sendMessage({ body: config.body || "", attachment: image.data }, event.threadID, event.messageID);
  }
};
