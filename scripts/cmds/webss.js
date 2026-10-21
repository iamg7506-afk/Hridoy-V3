const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "webss",
    aliases: ["screenshot"],
    version: "2.1",
    author: "HR ID OY",
    countDown: 10,
    role: 2,
    shortDescription: "Website screenshot",
    category: "Utility",
    guide: "{p}webss <url>"
  },

  onStart: async function ({ api, event, args, message }) {
    if (!args[0]) return message.reply("No URL provided!\nExample: !webss google.com");

    let url = args[0].trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    try { new URL(url); } catch { return message.reply("Invalid URL!"); }

    await api.setMessageReaction("⏳", event.messageID, () => {}, true);
    const screenshotPath = path.join(__dirname, `../tmp/webss_${Date.now()}.png`);

    try {
      // Get API config from gateway
      const cfg = await axios.get(`${API_BASE}/api/links/webss`);
      const { url: apiBase, body } = cfg.data;
      const apiUrl = `${apiBase}${encodeURIComponent(url)}?w=1280&h=800`;

      let imageBuffer;
      for (let i = 0; i < 5; i++) {
        const response = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 30000 });
        const buffer = Buffer.from(response.data);
        const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
        if (!isGif && buffer.length > 5000) { imageBuffer = buffer; break; }
        await new Promise(r => setTimeout(r, 4000));
      }

      if (!imageBuffer) throw new Error("Screenshot not ready");
      await fs.outputFile(screenshotPath, imageBuffer);
      await api.setMessageReaction("✅", event.messageID, () => {}, true);
      await message.reply({ body: `${body}\n🌐 ${url}`, attachment: fs.createReadStream(screenshotPath) });

    } catch (err) {
      await api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply(`Failed to take screenshot!\nError: ${err.message}`);
    } finally {
      setTimeout(() => fs.remove(screenshotPath).catch(() => {}), 10000);
    }
  }
};
