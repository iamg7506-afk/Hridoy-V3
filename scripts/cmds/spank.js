const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "spank",
    aliases: ["spnk"],
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    description: "🍑 Generate a spank image",
    category: "Tag Fun",
    guide: "{pn} @tag or reply"
  },

  langs: {
    en: { noTag: "Tag koro ba reply dao 🍑", fail: "❌ | Spank image generate kora jay nai." }
  },

  onStart: async function ({ event, message, usersData, getLang }) {
    const senderID = event.senderID;
    let targetID = Object.keys(event.mentions || {})[0];
    if (!targetID && event.messageReply?.senderID) targetID = event.messageReply.senderID;
    if (!targetID) return message.reply(getLang("noTag"));

    try {
      const [senderName, targetName] = await Promise.all([
        usersData.getName(senderID).catch(() => "Unknown"),
        usersData.getName(targetID).catch(() => "Unknown")
      ]);

      const [sAvUrl, tAvUrl] = await Promise.all([
        usersData.getAvatarUrl(senderID),
        usersData.getAvatarUrl(targetID)
      ]);

      // Get template config from api.json
      const cfg = await axios.get(`${API_BASE}/api/images/spank`);
      const { url: baseUrl, positions, messages } = cfg.data;

      const [senderAvatar, targetAvatar, baseImage] = await Promise.all([
        loadImage(sAvUrl),
        loadImage(tAvUrl),
        (async () => {
          const r = await axios.get(baseUrl, { responseType: "arraybuffer" });
          return loadImage(Buffer.from(r.data));
        })()
      ]);

      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      const drawCircleAvatar = (avatar, x, y, size) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x, y, size, size);
        ctx.restore();
      };

      drawCircleAvatar(senderAvatar, positions.sender.x, positions.sender.y, positions.sender.w);
      drawCircleAvatar(targetAvatar, positions.target.x, positions.target.y, positions.target.w);

      const tmpDir = path.join(__dirname, "tmp");
      await fs.ensureDir(tmpDir);
      const imgPath = path.join(tmpDir, `${senderID}_${targetID}_spank.png`);
      await fs.writeFile(imgPath, canvas.toBuffer("image/png"));

      const body = messages[0].replace("{sender}", senderName).replace("{target}", targetName);

      await message.reply({ body, attachment: fs.createReadStream(imgPath) });
      setTimeout(() => { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); }, 5000);

    } catch (err) {
      return message.reply(getLang("fail"));
    }
  }
};
