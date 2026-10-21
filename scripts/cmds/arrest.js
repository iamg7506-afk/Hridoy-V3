const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "arrest";

module.exports = {
  config: {
    name: "arrest",
    aliases: [],
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Arrest someone",
    longDescription: "Create arrest image using mention or reply",
    category: "Tag Fun",
    guide: { en: "{pn} @mention or reply" }
  },

  onStart: async function ({ event, message }) {
    try {
      let targetID;
      if (Object.keys(event.mentions || {}).length > 0)
        targetID = Object.keys(event.mentions)[0];
      else if (event.messageReply)
        targetID = event.messageReply.senderID;
      else
        return message.reply("❌ | Mention someone or reply to a message.");

      const configRes = await axios.get(`${API_BASE}/api/images/${CMD_NAME}`);
      const config = configRes.data;

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const output = path.join(cacheDir, `arrest_${Date.now()}.png`);

      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const av1Url = `https://graph.facebook.com/${event.senderID}/picture?width=512&height=512&access_token=${token}`;
      const av2Url = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${token}`;

      const [bg, av1, av2] = await Promise.all([
        loadImage(config.url),
        loadImage(av1Url),
        loadImage(av2Url)
      ]);

      const canvas = createCanvas(config.canvasSize.w, config.canvasSize.h);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, config.canvasSize.w, config.canvasSize.h);

      // sender position
      drawCircle(ctx, av1,
        config.positions.sender.x, config.positions.sender.y,
        config.positions.sender.w
      );
      // target position
      drawCircle(ctx, av2,
        config.positions.target.x, config.positions.target.y,
        config.positions.target.w
      );

      fs.writeFileSync(output, canvas.toBuffer("image/png"));

      const body = config.messages?.[0] || "🚔 | You are under arrest!";

      await message.reply({ body, attachment: fs.createReadStream(output) });

      setTimeout(() => { if (fs.existsSync(output)) fs.unlinkSync(output); }, 5000);

    } catch (err) {
      console.error(err);
      message.reply(`❌ | ${err.message}`);
    }
  }
};

function drawCircle(ctx, img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}
