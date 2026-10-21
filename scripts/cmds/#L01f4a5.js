const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "bang";

module.exports = {
  config: {
    name: "💥",
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 2,
    shortDescription: "Random voice",
    longDescription: "Send random voice from API",
    category: "Media"
  },

  onStart: async function ({ message }) {
    try {
      const configRes = await fetch(`${API_BASE}/api/audio/${CMD_NAME}`);
      if (!configRes.ok) throw new Error(`API config পাওয়া যায়নি (${configRes.status})`);
      const config = await configRes.json();

      const ids     = config.ids;
      const baseUrl = config.baseUrl;

      if (!ids || ids.length === 0) throw new Error("Audio list খালি!");

      const randomId  = ids[Math.floor(Math.random() * ids.length)];
      const audioUrl  = `${baseUrl}${randomId}`;

      const cacheDir  = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath  = path.join(cacheDir, `bang_${Date.now()}.mp3`);

      const response = await axios({
        url: audioUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await message.reply({
        body: "🎙️ Random Voice",
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);

    } catch (e) {
      console.log(e);
      return message.reply("❌ Audio send করতে সমস্যা হয়েছে");
    }
  }
};