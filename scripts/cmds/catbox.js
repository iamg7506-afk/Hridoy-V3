const axios = require("axios");
const fs = require("fs-extra");
const FormData = require("form-data");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "catbox", aliases: ["ct"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Upload media to catbox.moe", category: "AI", guide: { en: "{pn} (reply to image/video)" } },
  onStart: async function ({ event, api, message }) {
    const { messageReply, messageID } = event;
    if (!messageReply?.attachments?.length) return message.reply("Please reply to an image or video.");
    const fileUrl = messageReply.attachments[0].url;
    const ext = messageReply.attachments[0].type === "photo" ? ".jpg" : ".mp4";
    const filePath = path.join(__dirname, "temp" + ext);
    api.setMessageReaction("🕛", messageID, () => {}, true);
    const loading = await message.reply("⏳ Uploading to Catbox...");
    setTimeout(() => { api.unsendMessage(loading.messageID); }, 5000);
    try {
      const config = (await axios.get(`${API_BASE}/api/links/catbox`)).data;
      let uploadUrl = config.url;
      try { const fb = await axios.get(config.fallbackUrl); uploadUrl = fb.data[config.fallbackKey] || config.url; } catch {}
      const response = await axios.get(fileUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fs.createReadStream(filePath));
      const upload = await axios.post(uploadUrl, form, { headers: form.getHeaders() });
      fs.unlinkSync(filePath);
      api.setMessageReaction("✅", messageID, () => {}, true);
      return message.reply(upload.data);
    } catch (err) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ Failed to upload to Catbox.");
    }
  }
};
