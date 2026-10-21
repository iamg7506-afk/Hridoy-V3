const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "edit3";

module.exports = {
  config: {
    name: "edit2", version: "2.2", author: "HR ID OY", countDown: 5, role: 0,
    shortDescription: "Edit image with AI", category: "Image", guide: "{pn} [reply to image] [text]"
  },
  onStart: async function ({ api, event, args }) {
    const react = (e) => api.setMessageReaction(e, event.messageID, () => {}, true);
    const prompt = args.join(" ");
    if (!prompt) { react("⚠️"); return api.sendMessage("⚠️ Please provide text.", event.threadID); }
    const imageUrl = event.messageReply?.attachments[0]?.url;
    if (!imageUrl) { react("🖼️"); return api.sendMessage("🖼️ Please reply to an image.", event.threadID); }
    react("⏳");
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const apiUrl = `${config.url}?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
    const response = await axios.get(apiUrl, { responseType: "stream" });
    react("✅");
    api.sendMessage({ body: `✅ Image edited!\n📝 Prompt: ${prompt}`, attachment: response.data }, event.threadID);
  }
};
