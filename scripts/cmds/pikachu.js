const axios = require("axios");
const fs = require("fs");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "pikachu", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: { en: "Generate a Pikachu image with custom text" }, category: "Image", guide: { en: "{p}pikachu <text>" } },
  onStart: async function ({ message, args }) {
    if (!args.length) return message.reply("❌ | Please provide text.");
    const config = (await axios.get(`${API_BASE}/api/links/pikachu`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(args.join(" "))}`, { responseType: "arraybuffer" });
    const filePath = path.join(__dirname, "cache", `pikachu_${Date.now()}.png`);
    fs.writeFileSync(filePath, res.data);
    message.reply({ body: config.body, attachment: fs.createReadStream(filePath) }, () => fs.unlinkSync(filePath));
  }
};
