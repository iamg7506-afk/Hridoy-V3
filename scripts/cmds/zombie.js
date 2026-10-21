const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "zombie",
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Transform image into zombie version",
    category: "AI",
    guide: "{p}zombie (reply to any photo)"
  },

  onStart: async function ({ api, event, message }) {
    const repliedImage = event.messageReply?.attachments?.[0];
    if (!repliedImage || repliedImage.type !== "photo")
      return message.reply("❌ Please reply to an image.");

    const processingMsg = await message.reply("🧟 Transforming your image...");
    const imgPath = path.join(__dirname, "cache", `${Date.now()}_zombie.jpg`);

    try {
      // Get API config from gateway
      const cfg = await axios.get(`${API_BASE}/api/links/zombie`);
      const { url, body } = cfg.data;

      const apiUrl = `${url}?url=${encodeURIComponent(repliedImage.url)}&mode=2`;
      const response = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 60000 });

      await fs.ensureDir(path.dirname(imgPath));
      await fs.writeFile(imgPath, Buffer.from(response.data));
      await api.unsendMessage(processingMsg.messageID);
      await message.reply({ body, attachment: fs.createReadStream(imgPath) });

    } catch (error) {
      await api.unsendMessage(processingMsg.messageID);
      if (error.response?.status === 400) message.reply("❌ Invalid image format.");
      else message.reply("❌ Failed to transform image. Try again later.");
    } finally {
      if (fs.existsSync(imgPath)) await fs.remove(imgPath);
    }
  }
};
