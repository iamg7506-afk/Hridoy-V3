const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "imgur", aliases: ["imgup"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Upload image/video to Imgur", category: "Utility", guide: "{pn} [reply to image/video or provide URL]" },
  onStart: async function ({ api, event, args, message }) {
    let fileUrl;
    if (event.type === "message_reply" && event.messageReply?.attachments?.length > 0)
      fileUrl = event.messageReply.attachments[0].url;
    else if (args[0]?.startsWith("http")) fileUrl = args[0];
    else return message.reply("Please reply to an image/video or provide a URL.");
    const loading = await message.reply("⏳ Uploading to Imgur...");
    const config = (await axios.get(`${API_BASE}/api/links/imgur`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(fileUrl)}`);
    const keys = config.responseKey.split(".");
    const result = keys.reduce((obj, key) => obj?.[key], res.data);
    if (!result) throw new Error("Upload failed");
    api.unsendMessage(loading.messageID);
    return message.reply(`✅ Uploaded!\n🔗 ${result}`);
  }
};
