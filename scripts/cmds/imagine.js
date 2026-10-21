const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "imagine", aliases: ["img"], version: "2.2", author: "HR ID OY", role: 0, category: "AI", shortDescription: "AI দিয়ে image বানাও", guide: "{pn} <prompt>", coolDown: 10 },
  onStart: async function ({ args, message, event }) {
    const prompt = args.join(" ").trim();
    if (!prompt) return message.reply("🎨 কী বানাতে চাও লেখো!\nExample: !imagine a cat wearing sunglasses");
    const cacheDir = path.join(__dirname, "cache"); await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `imagine_${Date.now()}.jpg`);
    try {
      await message.reply("🎨 Image generate হচ্ছে, একটু অপেক্ষা করো...");
      const config = (await axios.get(`${API_BASE}/api/links/imagine`, { timeout: 10000 })).data;
      const imageUrl = `${config.url}${encodeURIComponent(prompt)}${config.defaultParams}`;
      const res = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 60000, headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.data || res.data.byteLength < 1000) throw new Error("Image generate হয়নি");
      await fs.writeFile(filePath, Buffer.from(res.data));
      const body = (config.body || "✅ Prompt: {prompt}").replace("{prompt}", prompt);
      await message.reply({ body, attachment: fs.createReadStream(filePath) });
    } catch (err) {
      return message.reply(`❌ Image generate করা যায়নি!\nError: ${err.message}`);
    } finally {
      setTimeout(async () => { try { await fs.remove(filePath); } catch {} }, 15000);
    }
  }
};
