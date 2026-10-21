const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "i", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Generate multiple AI images from text", category: "AI", guide: { en: "Example: {pn} cute girl | 4" } },
  onStart: async function ({ api, args, message, event }) {
    const text = args.join(" ");
    if (!text) return message.reply("⚠️ Please provide a prompt.");
    let prompt, quantity;
    if (text.includes("|")) {
      [prompt, quantity] = text.split("|").map(s => s.trim());
      quantity = parseInt(quantity);
      if (isNaN(quantity) || quantity < 1 || quantity > 10) return message.reply("⚠️ Quantity must be 1-10.");
    } else { prompt = text; quantity = 4; }
    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    const waitingMessage = await message.reply(`✅ | Generating ${quantity} image(s)...`);
    const config = (await axios.get(`${API_BASE}/api/links/i`)).data;
    const imageUrls = [];
    for (let i = 0; i < quantity; i++) {
      const res = await axios.get(config.url, { params: { [config.queryParam]: prompt, [config.ratioParam]: config.defaultRatio } });
      if (res.data?.[config.responseKey]) imageUrls.push(res.data[config.responseKey]);
    }
    const imageStreams = await Promise.all(imageUrls.map(url => global.utils.getStreamFromURL(url)));
    await message.reply({ attachment: imageStreams });
    api.setMessageReaction("✅", event.messageID, () => {}, true);
    await api.unsendMessage(waitingMessage.messageID);
  }
};
