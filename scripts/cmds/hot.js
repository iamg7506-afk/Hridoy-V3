const axios = require("axios");
const fs = require("fs-extra");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "hot", version: "2.1", role: 2, author: "HR ID OY", description: "18+ VIDEO SEND", category: "NSFW", cooldowns: 5 },
  onStart: async function ({ event, api }) {
    const config = (await axios.get(`${API_BASE}/api/audio/hot`)).data;
    const randomId = config.ids[Math.floor(Math.random() * config.ids.length)];
    const url = `${config.baseUrl}${randomId}`;
    const filePath = __dirname + "/cache/funvideo.mp4";
    await fs.ensureDir(__dirname + "/cache");
    try {
      const response = await axios({ url, method: "GET", responseType: "stream" });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on("finish", () => {
        api.sendMessage({ body: config.body, attachment: fs.createReadStream(filePath) }, event.threadID, () => fs.unlinkSync(filePath));
      });
    } catch (e) {
      api.sendMessage("❌ ভিডিও লোড করা যায়নি!", event.threadID);
    }
  }
};
