const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "girlanime";

module.exports = {
  config: {
    name: "girlanime", version: "2.2", author: "HR ID OY",
    countDown: 5, role: 0, shortDescription: "Random Anime Pic",
    category: "Image", guide: "{pn}"
  },
  onStart: async function ({ message }) {
    const config = (await axios.get(`${API_BASE}/api/audio/${CMD_NAME}`)).data;
    const url = config.ids[Math.floor(Math.random() * config.ids.length)];
    const filePath = path.join(__dirname, "cache", `girlanime_${Date.now()}.jpg`);
    await fs.ensureDir(path.dirname(filePath));
    const res = await axios({ url, method: "GET", responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "image/*" } });
    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);
    await new Promise((r, j) => { writer.on("finish", r); writer.on("error", j); });
    await message.reply({ body: config.body || "🌸 Girl Anime Pic 🌸", attachment: fs.createReadStream(filePath) });
    fs.unlinkSync(filePath);
  }
};
