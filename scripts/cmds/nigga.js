const axios = require("axios");
const fs = require("fs");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "nigga", aliases: [], version: "2.1", author: "HR ID OY", countDown: 2, role: 0, description: "Send a roast image", category: "Tag Fun", guide: { en: "{pn} @mention" } },
  onStart: async function ({ api, event }) {
    let targetUID = event.type === "message_reply" ? event.messageReply.senderID : Object.keys(event.mentions || {})[0] || event.senderID;
    const config = (await axios.get(`${API_BASE}/api/links/nigga`)).data;
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const response = await axios.get(`${config.url}?${config.queryParam}=${targetUID}`, { responseType: "arraybuffer" });
    const filePath = path.join(cacheDir, `roast_${targetUID}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(response.data));
    api.sendMessage({ body: config.body, attachment: fs.createReadStream(filePath) }, event.threadID, () => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, event.messageID);
  }
};
