const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "cuteayka",
    version: "5.0.1",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Random Ayaka image",
    category: "Image",
    guide: "{pn}",
    cooldown: 5
  },

  onStart: async function ({ api, event }) {
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `ayaka_${Date.now()}.jpg`);

    try {
      let imgUrl;

      // 1st priority: waifu.pics (API থেকে URL নাও)
      try {
        const cfg = await axios.get(`${API_BASE}/api/links/waifu_sfw`);
        const waifuUrl = cfg.data?.url;
        const waifuRes = await axios.get(waifuUrl);
        imgUrl = waifuRes.data?.url;
      } catch {
        imgUrl = null;
      }

      // fallback: picsum
      if (!imgUrl) imgUrl = "https://picsum.photos/500";

      const res = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 15000 });
      fs.writeFileSync(filePath, Buffer.from(res.data));

      await api.sendMessage(
        { body: "🌸 Ayaka Photo 💞", attachment: fs.createReadStream(filePath) },
        event.threadID, () => fs.unlinkSync(filePath), event.messageID
      );
    } catch (err) {
      return api.sendMessage({
        body: "🌸 Ayaka Photo 💞",
        attachment: await global.utils.getStreamFromURL("https://picsum.photos/500")
      }, event.threadID, event.messageID);
    }
  }
};
