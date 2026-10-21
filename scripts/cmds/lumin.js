const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "lumin", version: "2.2", author: "HR ID OY", countDown: 5, role: 0, description: { en: "Generate AI image using Luminarium" }, category: "AI", guide: { en: "{pn} <prompt>" } },
  onStart: async function ({ message, event, args, api }) {
    const prompt = args.join(" ");
    if (!prompt) return message.reply("⚠️ Please provide a prompt.");

    let imgPath, waitingMsg;
    try {
      try { api.setMessageReaction("🎨", event.messageID, () => {}, true); } catch {}
      waitingMsg = await message.reply("🎨 Generating your Luminarium image... Please wait...");

      const config = (await axios.get(`${API_BASE}/api/links/lumin`, { timeout: 15000 })).data;
      imgPath = path.join(__dirname, "cache", `lumin_${event.senderID}.png`);
      await fs.ensureDir(path.dirname(imgPath));

      const response = await axios.get(
        `${config.url}?${config.queryParam}=${encodeURIComponent(prompt)}`,
        { responseType: "arraybuffer", timeout: 60000 }
      );
      fs.writeFileSync(imgPath, response.data);

      await message.reply({ body: `✅ Here is your generated lumin image.`, attachment: fs.createReadStream(imgPath) },
        () => {
          fs.unlink(imgPath, () => {});
          if (waitingMsg?.messageID) { try { api.unsendMessage(waitingMsg.messageID); } catch {} }
        });
    } catch (err) {
      console.error("[lumin] error:", err?.message || err);
      if (imgPath && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      if (waitingMsg?.messageID) { try { api.unsendMessage(waitingMsg.messageID); } catch {} }
      return message.reply("❌ Luminarium generation failed — the upstream service may be down. Please try again later.");
    }
  }
};
