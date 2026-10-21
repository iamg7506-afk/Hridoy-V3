const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "message",
    version: "1.2",
    author: "HR ID OY",
    role: 2, // Admin only
    shortDescription: "Send announcement to all groups",
    longDescription: "Send announcement with optional text or replied media to all groups",
    category: "Group",
    guide: "{pn} [message] (or reply to media/text)",
    cooldown: 5
  },

  onStart: async function ({ api, event, args }) {
    let input = args.join(" ");
    let attachment = [];

    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);

    // If reply exists
    if (event.messageReply) {
      const reply = event.messageReply;

      // যদি args না থাকে, reply text use করবে
      if (!input && reply.body) {
        input = reply.body;
      }

      // যদি reply তে media থাকে
      if (reply.attachments && reply.attachments.length > 0) {
        for (const atc of reply.attachments) {
          let ext;

          if (atc.type === "photo") ext = ".jpg";
          else if (atc.type === "animated_image") ext = ".gif";
          else if (atc.type === "video") ext = ".mp4";
          else continue;

          const filePath = path.join(
            cacheDir,
            `${Date.now()}_${Math.floor(Math.random() * 9999)}${ext}`
          );

          const res = await axios.get(atc.url, {
            responseType: "arraybuffer"
          });

          fs.writeFileSync(filePath, Buffer.from(res.data));
          attachment.push(filePath);
        }
      }
    }

    if (!input && attachment.length === 0) {
      return api.sendMessage(
        "📢 Use like this:\n.message your text\n(or reply to media/text)",
        event.threadID,
        event.messageID
      );
    }

    const title = "📣 ANNOUNCEMENT FROM HR ID OY";

    const msg = input
      ? `[ ${title} ]\n\n${input}\n\n──────────────────────`
      : "";

    try {
      const threads = await api.getThreadList(100, null, ["INBOX"]);
      const groupThreads = threads.filter(t => t.isGroup);

      let count = 0;

      for (const thread of groupThreads) {
        try {
          const files = attachment.map(p => fs.createReadStream(p));

          await api.sendMessage(
            {
              body: msg || undefined,
              attachment: files.length > 0 ? files : undefined
            },
            thread.threadID
          );

          count++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.log("Failed to send in:", thread.threadID);
        }
      }

      // Cache delete
      for (const file of attachment) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }

      return api.sendMessage(
        `✅ Announcement sent to ${count} groups.`,
        event.threadID,
        event.messageID
      );

    } catch (error) {
      console.error(error);
      return api.sendMessage(
        "❌ Something went wrong while sending announcement.",
        event.threadID,
        event.messageID
      );
    }
  }
};
