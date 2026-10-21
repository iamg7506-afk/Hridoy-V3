const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "pastebin",
    version: "1.2",
    author: "HR ID OY",
    countDown: 5,
    role: 1,
    shortDescription: "Upload bot file or replied text/code to Pastebin",
    category: "Utility",
    guide: {
      en: "{pn}pastebin <filename>: upload a file from the bot's folder"
        + "\n{pn}pastebin <name>: reply to a message with code/text to upload its content instead"
        + "\nExample: {pn}pastebin hop.js"
        + "\nExample (reply): reply to a code message, then {pn}pastebin hop.js"
    },
  },

  onStart: async function ({ event, args, message }) {
    const PASTEBIN_API_KEY = "gox0XMEkCRsKqzS5Jh9ffKD4mv7vya-3";

    let fileName;
    let fileContent;

    // ==== NEW: reply-to-upload ====
    // Reply to any message that contains raw text/code, then run
    // ".pastebin <name>" — the replied message's content gets pasted
    // instead of reading a file off disk.
    const repliedMessage = event.messageReply;

    if (repliedMessage) {
      fileName = args[0] || `pasted_${Date.now()}.txt`;

      fileContent = (repliedMessage.body || "").trim();

      // Fallback: no text but the replied message has a file/link
      // attachment — use its url as a pointer instead of raw content.
      if (!fileContent && Array.isArray(repliedMessage.attachments) && repliedMessage.attachments[0]) {
        fileContent = repliedMessage.attachments[0].url || "";
      }

      if (!fileContent)
        return message.reply("❌ The message you replied to has no text, code, or link to upload.");
    }
    else {
      // ==== ORIGINAL BEHAVIOR (unchanged) — read a file from disk ====
      if (!args[0]) return message.reply("Usage: .pastebin <filename>\nExample: .pastebin hop.js\n(Or reply to a message containing code/text with .pastebin <name>)");

      fileName = args[0];
      const filePath = path.join(__dirname, fileName);

      if (!fs.existsSync(filePath)) return message.reply(`❌ File not found: ${fileName}`);

      fileContent = fs.readFileSync(filePath, "utf8");
    }

    const params = new URLSearchParams();
    params.append("api_dev_key", PASTEBIN_API_KEY);
    params.append("api_option", "paste");
    params.append("api_paste_code", fileContent);
    params.append("api_paste_name", fileName);
    params.append("api_paste_expire_date", "N");
    params.append("api_paste_private", "0");

    const res = await axios.post("https://pastebin.com/api/api_post.php", params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (res.data.startsWith("https://pastebin.com/")) {
      const pasteID = res.data.trim().replace("https://pastebin.com/", "");
      return message.reply(`✅ ${fileName}\n🔗 https://pastebin.com/raw/${pasteID}`);
    } else {
      return message.reply(`❌ ${res.data}`);
    }
  },
};
