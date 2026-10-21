const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "alert";

module.exports = {
  config: {
    name: "alert",
    version: "2.2",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Create an alert style image with custom text" },
    category: "Image",
    guide: { en: "{p}alert <text>" }
  },

  onStart: async function ({ message, args }) {
    if (!args.length) return message.reply("❌ | Please provide text.\nExample: .alert Warning!");

    const text = encodeURIComponent(args.join(" "));

    try {
      const configRes = await axios.get(`${API_BASE}/api/links/${CMD_NAME}`);
      const config = configRes.data;

      const res = await axios.get(`${config.url}?${config.queryParam}=${text}`, {
        responseType: "arraybuffer"
      });

      const filePath = path.join(__dirname, "cache", `alert_${Date.now()}.png`);
      fs.writeFileSync(filePath, res.data);

      message.reply({
        body: "Here's your alert image!",
        attachment: fs.createReadStream(filePath)
      }, () => fs.unlinkSync(filePath));

    } catch (err) {
      console.error(err);
      message.reply("❌ | Failed to generate alert image.");
    }
  }
};
