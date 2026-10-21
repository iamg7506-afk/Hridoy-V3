const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "burn",
    version: "2.0.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Burn target's avatar" },
    longDescription: { en: "Apply burn effect to a mentioned or replied user's profile picture" },
    category: "Tag Fun",
    guide: { en: "{pn} @mention\n{pn} (reply to a user)" }
  },

  onStart: async function ({ api, event }) {
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath;

    try {
      let uid;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
      } else if (event.messageReply?.senderID) {
        uid = event.messageReply.senderID;
      } else {
        return api.sendMessage("👤 Please mention or reply to a user.", event.threadID, event.messageID);
      }

      const avatar = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${FB_TOKEN}`;

      const cfg = await axios.get(`${API_BASE}/api/links/burn_canvas`);
      const canvasApiBase = cfg.data?.url;
      if (!canvasApiBase) throw new Error("No burn API config");

      const apiUrl = `${canvasApiBase}?avatar=${encodeURIComponent(avatar)}`;

      filePath = path.join(cacheDir, `burn_${uid}_${Date.now()}.png`);

      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "image/png,image/jpeg,image/*,*/*" }
      });

      await fs.writeFile(filePath, Buffer.from(response.data));

      await api.sendMessage(
        { body: "🔥 Burn Canvas", attachment: fs.createReadStream(filePath) },
        event.threadID, event.messageID
      );
    } catch (error) {
      await api.sendMessage(`❌ Failed to generate burn canvas.\n${error.response?.status || error.message}`, event.threadID, event.messageID);
    } finally {
      if (filePath && await fs.pathExists(filePath)) await fs.remove(filePath).catch(() => {});
    }
  }
};
