const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "squeeze",
    version: "2.1",
    author: "HR ID OY",
    role: 2,
    description: "Squeeze your friend (reply or mention)",
    category: "NSFW",
    guide: "{pn} @tag or reply",
    cooldowns: 5
  },

  onStart: async function ({ api, event }) {
    try {
      let mentionID, tagName;

      if (event.type === "message_reply") {
        mentionID = event.messageReply.senderID;
        const userInfo = await api.getUserInfo(mentionID);
        tagName = userInfo[mentionID]?.name || "friend";
      } else if (event.mentions && Object.keys(event.mentions).length > 0) {
        mentionID = Object.keys(event.mentions)[0];
        tagName = event.mentions[mentionID].replace("@", "");
      } else {
        return api.sendMessage("❌ Please reply to someone or tag them!", event.threadID, event.messageID);
      }

      // Fetch gif list from api.json
      const res = await axios.get(`${API_BASE}/api/audio/squeeze_gifs`);
      const { ids, body } = res.data;
      const randomGif = ids[Math.floor(Math.random() * ids.length)];

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const gifPath = path.join(cacheDir, `squeeze_${Date.now()}.gif`);

      const response = await axios({ url: randomGif, method: "GET", responseType: "stream" });
      const writer = fs.createWriteStream(gifPath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage({
          body: body.replace("{target}", tagName),
          mentions: [{ tag: tagName, id: mentionID }],
          attachment: fs.createReadStream(gifPath)
        }, event.threadID, () => fs.existsSync(gifPath) && fs.unlinkSync(gifPath), event.messageID);
      });

      writer.on("error", () => {
        api.sendMessage("❌ Failed to download GIF.", event.threadID, event.messageID);
      });

    } catch (err) {
      api.sendMessage("❌ An unexpected error occurred.", event.threadID, event.messageID);
    }
  }
};
