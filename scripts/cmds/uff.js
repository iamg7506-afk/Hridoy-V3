const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "uff",
    author: "HR ID OY",
    version: "2.0",
    cooldowns: 5,
    role: 2,
    shortDescription: "tiktok video",
    longDescription: " tiktok video",
    category: "NSFW",
    guide: "{p}uff"
  },

  onStart: async function ({ api, event, args, message }) {
    try {
      // Video API url + response key come from the HR ID OY API
      const { data: cfg } = await axios.get(`${BASE}/api/links/uff`);

      const response = await axios.get(cfg.url);
      const videoUrl = String(cfg.responseKey || "videoUrl")
        .split(".")
        .reduce((o, k) => (o == null ? o : o[k]), response.data);

      if (!videoUrl) throw new Error("No video url in API response");

      const cacheDir = path.join(__dirname, "cache");

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const tempVideoPath = path.join(
        cacheDir,
        `${Date.now()}.mp4`
      );

      const writer = fs.createWriteStream(tempVideoPath);

      const videoResponse = await axios.get(videoUrl, {
        responseType: "stream"
      });

      videoResponse.data.pipe(writer);

      writer.on("finish", async () => {
        try {
          const stream = fs.createReadStream(tempVideoPath);

          await message.reply({
            body: "",
            attachment: stream
          });

          fs.unlink(tempVideoPath, () => {});
        } catch (error) {
          console.error("Error sending video:", error);
          fs.unlink(tempVideoPath, () => {});
        }
      });

      writer.on("error", (error) => {
        console.error("Video download error:", error);
        fs.unlink(tempVideoPath, () => {});
        message.reply("Sorry, an error occurred while downloading the video.");
      });

    } catch (error) {
      console.error("Error fetching OnlyTik video:", error);
      message.reply("Sorry, an error occurred while processing your request.");
    }
  }
};
