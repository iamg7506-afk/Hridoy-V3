const axios = require("axios");
const fs = require("fs");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "nokia", version: "2.1", author: "HR ID OY", countDown: 10, role: 0, shortDescription: { en: "Apply Nokia screen effect" }, category: "Tag Fun", guide: { en: "{p}nokia [@mention or reply]" } },
  onStart: async function ({ api, event, message }) {
    const { senderID, mentions, type, messageReply } = event;
    let uid = Object.keys(mentions)[0] || (type === "message_reply" ? messageReply.senderID : senderID);
    const config = (await axios.get(`${API_BASE}/api/links/nokia`)).data;
    const avatarURL = `https://graph.facebook.com/${uid}/picture?height=512&width=512&access_token=350685531728|62f8ce9f74b12f84c123cc23437a4a32`;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(avatarURL)}`, { responseType: "arraybuffer" });
    const imagePath = path.join(__dirname, "cache", `nokia_${uid}.jpg`);
    fs.writeFileSync(imagePath, res.data);
    message.reply({ body: config.body, attachment: fs.createReadStream(imagePath) }, () => fs.unlinkSync(imagePath));
  }
};
