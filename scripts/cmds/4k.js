const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "4k";

module.exports = {
  config: {
    name: "4k",
    aliases: ["upscale", "enhance"],
    version: "2.1",
    author: "HR ID OY",
    countDown: 15,
    role: 0,
    shortDescription: { en: "Upscale image to 4K quality" },
    category: "Image",
    guide: { en: "Reply to image or type !4k <image_url>" }
  },

  onStart: async function ({ api, event, args, message }) {
    let loadingMsg;
    try {
      let imageUrl;
      if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
        imageUrl = event.messageReply.attachments[0].url;
      } else if (args[0]?.startsWith("http")) {
        imageUrl = args[0];
      } else {
        return message.reply("❌ Please reply to an image or provide image URL.");
      }

      const configRes = await axios.get(`${API_BASE}/api/links/${CMD_NAME}`);
      const config = configRes.data;

      loadingMsg = await message.reply("⏳ Uploading Please wait...");

      const response = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(imageUrl)}`);

      if (response.data.status !== "success" || !response.data[config.responseKey]) {
        throw new Error("Upscale failed");
      }

      const upscaledImageUrl = response.data[config.responseKey];

      const imageResponse = await axios({
        method: "GET",
        url: upscaledImageUrl,
        responseType: "stream",
        timeout: 30000
      });

      const filePath = path.join(__dirname, `/cache/upscaled_${Date.now()}.jpg`);
      const writer = fs.createWriteStream(filePath);
      imageResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          api.unsendMessage(loadingMsg.messageID);
          message.reply({
            body: "✅ Image successfully upscaled to 4K!",
            attachment: fs.createReadStream(filePath)
          }, () => { fs.unlinkSync(filePath); resolve(); });
        });
        writer.on("error", (err) => {
          api.unsendMessage(loadingMsg.messageID);
          message.reply("❌ Failed to save image.");
          reject(err);
        });
      });

    } catch (error) {
      console.error("Upscale error:", error);
      if (loadingMsg) api.unsendMessage(loadingMsg.messageID);
      message.reply("❌ Upscale failed. Please try again.");
    }
  }
};
