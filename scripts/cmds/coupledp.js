const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "coupledp",
    version: "1.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Random couple DP 💑",
    category: "Love",
    guide: { en: "{pn}coupledp" },
  },

  onStart: async function ({ message }) {
    try {
      // Fetch couple image list from API
      const { data: cfg } = await axios.get(`${BASE}/api/images/cdp`);

      const couples = cfg.couples || [];
      if (!couples.length) return message.reply("❌ No couple data found.");

      const couple = couples[Math.floor(Math.random() * couples.length)];

      const [boyImg, girlImg] = await Promise.all([
        loadImage(couple.boy),
        loadImage(couple.girl),
      ]);

      const size = 500;
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const boyCanvas = createCanvas(size, size);
      boyCanvas.getContext("2d").drawImage(boyImg, 0, 0, size, size);
      const boyPath = path.join(cacheDir, `boy_${Date.now()}.png`);
      fs.writeFileSync(boyPath, boyCanvas.toBuffer("image/png"));

      const girlCanvas = createCanvas(size, size);
      girlCanvas.getContext("2d").drawImage(girlImg, 0, 0, size, size);
      const girlPath = path.join(cacheDir, `girl_${Date.now()}.png`);
      fs.writeFileSync(girlPath, girlCanvas.toBuffer("image/png"));

      const msgs = cfg.messages || ["💑 Tomar jonno perfect couple DP! 💖"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)];

      await message.reply({
        body: `${caption}\n`,
        attachment: [
          fs.createReadStream(boyPath),
          fs.createReadStream(girlPath),
        ],
      });

      setTimeout(() => {
        try { fs.unlinkSync(boyPath); fs.unlinkSync(girlPath); } catch (_) {}
      }, 30000);

    } catch (err) {
      console.error("CoupleDP error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
