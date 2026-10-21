const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "captionvideo",
    aliases: ["captionvid", "cv"],
    version: "1.1",
    author: "HR ID OY",
    role: 0,
    countDown: 2,
    description: "Get a random caption video or add your own video to the caption album.",
    category: "Media",
    guide: "• Use /captionvideo to get a random caption video.\n• Reply to a video with /captionvideo add to upload it to the caption album."
  },

  onStart: async function ({ api, event, args }) {
    let processingMessage;
    try {
      processingMessage = await api.sendMessage(
        "⏳ Please wait few seconds...",
        event.threadID,
        event.messageID
      );

      const GITHUB_RAW = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";
      const rawRes = await axios.get(GITHUB_RAW);
      const baseUrl = rawRes.data.apiv1;

      if (args[0]?.toLowerCase() === "add") {
        const category = "caption";

        if (!event.messageReply || !event.messageReply.attachments?.length) {
          await api.unsendMessage(processingMessage.messageID);
          return api.sendMessage(
            "❌ Please reply to a video to add it to the caption album.",
            event.threadID,
            event.messageID
          );
        }

        const attachment = event.messageReply.attachments[0];
        if (!attachment.type.includes("video")) {
          await api.unsendMessage(processingMessage.messageID);
          return api.sendMessage(
            "❌ The replied attachment is not a video.",
            event.threadID,
            event.messageID
          );
        }

        const videoUrl = attachment.url;
        const videoPath = path.resolve(__dirname, "temp_video.mp4");

        const videoResp = await axios.get(videoUrl, { responseType: "stream" });
        const writer = fs.createWriteStream(videoPath);
        videoResp.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", fs.createReadStream(videoPath));
        const catboxResp = await axios.post("https://catbox.moe/user/api.php", form, { headers: form.getHeaders() });
        const catboxUrl = catboxResp.data.trim();
        fs.unlinkSync(videoPath);

        if (!catboxUrl.startsWith("https://")) {
          await api.unsendMessage(processingMessage.messageID);
          return api.sendMessage(
            "❌ Something went wrong with Catbox upload.",
            event.threadID,
            event.messageID
          );
        }

        const apiResp = await axios.get(`${baseUrl}/api/albumadd?category=${category}&url=${encodeURIComponent(catboxUrl)}`);

        await api.unsendMessage(processingMessage.messageID);
        return api.sendMessage(
          `${apiResp.data.message}\n${apiResp.data.url}`,
          event.threadID,
          event.messageID
        );
      }

      const res = await axios.get(`${baseUrl}/api/album?category=caption`);
      if (!res.data.url) {
        await api.unsendMessage(processingMessage.messageID);
        return api.sendMessage(
          "❌ Could not fetch caption video!",
          event.threadID,
          event.messageID
        );
      }

      const videoMsg = {
        body: "🎬 Here's a random caption video for you! 😊💖",
        attachment: await global.utils.getStreamFromURL(res.data.url)
      };

      await api.sendMessage(videoMsg, event.threadID, event.messageID);

      await api.unsendMessage(processingMessage.messageID);

    } catch (error) {
      console.error(error);
      if (processingMessage) await api.unsendMessage(processingMessage.messageID);
      return api.sendMessage(
        "❌ Something went wrong. Please try again later.",
        event.threadID,
        event.messageID
      );
    }
  }
};
