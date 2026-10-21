const axios = require("axios");
const fs = require("fs-extra");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "flux";

module.exports = {
  config: {
    name: "flux", version: "2.1", author: "HR ID OY", countDown: 5, role: 0,
    shortDescription: "Generate AI images with Flux", category: "Image",
    guide: "{pn} <prompt> | [style]"
  },
  onStart: async function ({ message, args }) {
    if (!args[0]) return message.reply("❗ Please provide a prompt.");
    const input = args.join(" ").split("|");
    const rawPrompt = input[0].trim();
    const style = input[1]?.trim().toLowerCase() || "";
    const styleMap = {
      realistic: "photorealistic, ultra-detailed, 8K UHD, DSLR quality",
      anime: "anime style, vibrant colors, sharp lines, cel shading",
      fantasy: "fantasy art, epic background, magical aura, dramatic lighting",
      cyberpunk: "cyberpunk, neon lights, futuristic cityscape, dark atmosphere",
      cartoon: "cartoon style, bold outlines, bright colors, 2D animation look"
    };
    const finalPrompt = style && styleMap[style] ? `${rawPrompt}, ${styleMap[style]}` : rawPrompt;
    message.reply("🖼️ Generating your premium AI image...");
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${encodeURIComponent(finalPrompt)}`);
    const imageUrl = res?.data?.data?.imageUrl;
    if (!imageUrl) return message.reply("❌ Failed to generate image.");
    const imgStream = await axios.get(imageUrl, { responseType: "stream" });
    const filePath = `${__dirname}/cache/flux_${Date.now()}.jpg`;
    await fs.ensureDir(`${__dirname}/cache`);
    const writer = fs.createWriteStream(filePath);
    imgStream.data.pipe(writer);
    writer.on("finish", () => {
      message.reply({ body: `🧠 Prompt: ${rawPrompt}${style ? `\n🎨 Style: ${style}` : ""}`, attachment: fs.createReadStream(filePath) },
        () => fs.unlinkSync(filePath));
    });
  }
};
