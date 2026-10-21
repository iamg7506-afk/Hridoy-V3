const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

const IMGBB_API_KEY = "c7de9df7d67a5ac9b9462db3983cff32";

module.exports = {
  config: {
    name: "imgbb",
    version: "1.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Upload image/video to ImgBB 📤",
    category: "Utility",
    guide: { en: "Reply to a photo/video with {pn}imgbb" },
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, messageReply } = event;

    // Must be a reply
    if (!messageReply) {
      return message.reply("❌ Photo বা Video এর reply এ command দাও!\nExample: (photo reply করে) .imgbb");
    }

    const attachments = messageReply.attachments;
    if (!attachments || attachments.length === 0) {
      return message.reply("❌ Reply এ কোনো photo/video নেই!");
    }

    const attachment = attachments[0];
    const type = attachment.type;

    // Only support photo and video
    if (!["photo", "video", "sticker", "animated_image"].includes(type)) {
      return message.reply("❌ শুধু photo বা video upload করা যাবে!");
    }

    try {
      message.reply("⏳ Uploading to ImgBB...");

      const fileURL = attachment.url || attachment.playbackUrl || attachment.previewUrl;
      if (!fileURL) return message.reply("❌ File URL পাওয়া যায়নি!");

      // Download the file
      const response = await axios.get(fileURL, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data);

      // Convert to base64
      const base64 = buffer.toString("base64");

      // Upload to ImgBB
      const form = new FormData();
      form.append("key", IMGBB_API_KEY);
      form.append("image", base64);

      const uploadRes = await axios.post("https://api.imgbb.com/1/upload", form, {
        headers: form.getHeaders(),
      });

      const data = uploadRes.data.data;
      const viewURL   = data.url_viewer;  // page link
      const directURL = data.url;          // direct image link
      const deleteURL = data.delete_url;   // delete link

      return message.reply(
        `✅ Upload সফল!\n\n` +
        `🔗 Direct Link:\n${directURL}\n\n` +
        `🌐 View Page:\n${viewURL}\n\n` +
        `🗑️ Delete Link:\n${deleteURL}`
      );

    } catch (err) {
      console.error("ImgBB error:", err?.response?.data || err.message);
      return message.reply("❌ Upload failed!\nError: " + (err?.response?.data?.error?.message || err.message));
    }
  },
};