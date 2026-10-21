const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "edit4";

module.exports = {
  config: {
    name: "edit3", aliases: ["imageedit"], version: "2.1", author: "HR ID OY",
    countDown: 10, role: 0, shortDescription: "AI Image Editor", category: "Image",
    guide: "{pn} [reply to image] [prompt]"
  },
  onStart: async function ({ event, message, args, api }) {
    const { messageReply, type, messageID, threadID } = event;
    if (type !== "message_reply" || !messageReply.attachments?.[0] || messageReply.attachments[0].type !== "photo")
      return api.sendMessage("⚠️ Please reply to an image.", threadID, messageID);
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("📝 Please provide a prompt.", threadID, messageID);
    const imageUrl = encodeURIComponent(messageReply.attachments[0].url);
    const cacheDir = path.join(__dirname, "cache");
    const filePath = path.join(cacheDir, `edited_${Date.now()}.png`);
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    api.setMessageReaction("🎨", messageID, () => {}, true);
    const processingMsg = await api.sendMessage("🪄 Processing...", threadID);
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const response = await axios({ method: "GET",
      url: `${config.url}?img=${imageUrl}&prompt=${encodeURIComponent(prompt)}`,
      responseType: "arraybuffer", timeout: 240000 });
    await fs.writeFile(filePath, Buffer.from(response.data));
    api.setMessageReaction("✅", messageID, () => {}, true);
    await api.unsendMessage(processingMsg.messageID);
    await api.sendMessage({ body: `✨ IMAGE EDITED\nPrompt: ${prompt}`, attachment: fs.createReadStream(filePath) },
      threadID, () => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, messageID);
  }
};
