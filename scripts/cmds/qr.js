const QRCode = require("qrcode");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "qr", aliases: ["qrcode"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Generate a QR code", category: "Utility", guide: { en: "{pn} [text or link]" } },
  onStart: async function ({ message, args, event }) {
    const qrData = args.join(" ").trim() || "https://example.com";
    const config = (await axios.get(`${API_BASE}/api/links/qr`)).data;
    message.reaction("⏳", event.messageID);
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const tempFilePath = path.join(cacheDir, `qr_${Date.now()}.png`);
    try {
      await QRCode.toFile(tempFilePath, qrData, { color: config.color, scale: config.scale });
      message.reaction("✅", event.messageID);
      await message.reply({ body: config.body, attachment: fs.createReadStream(tempFilePath) });
    } finally {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
  }
};
