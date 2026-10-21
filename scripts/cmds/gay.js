const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: { name: "gay", version: "2.2", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "{pn} @mention or reply" } },
  onStart: async function ({ api, event }) {
    const cacheDir = path.join(__dirname, "cache"); await fs.ensureDir(cacheDir);
    let uid = event.messageReply?.senderID || Object.keys(event.mentions||{})[0] || event.senderID;

    // FIX: use getUserInfo instead of getUserInfoV2
    let name = "User";
    try { const info = await api.getUserInfo(uid); name = info?.[uid]?.name || "User"; } catch {}

    const avatarURL = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const config = (await axios.get(`${API_BASE}/api/links/gay`, { timeout: 10000 })).data;
    const filePath = path.join(cacheDir, `gay_${uid}_${Date.now()}.png`);
    const response = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(avatarURL)}`, { responseType: "arraybuffer", timeout: 60000 });
    await fs.writeFile(filePath, Buffer.from(response.data));
    await api.sendMessage({ body: `${config.body}\n👤 ${name}`, attachment: fs.createReadStream(filePath) }, event.threadID, event.messageID);
    await fs.remove(filePath).catch(()=>{});
  }
};
