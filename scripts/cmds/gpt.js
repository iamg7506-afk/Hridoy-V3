const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "ai", aliases: ["chatgpt","gpt","ask"], version: "2.1", author: "HR ID OY", countDown: 3, role: 0, shortDescription: "Chat with free AI", category: "AI", guide: "{pn} <question>" },
  onStart: async function ({ message, event, args }) {
    const question = args.join(" ").trim();
    if (!question) return message.reply("🤖 | Please ask me something.\n\nExample:\n.ai Who is Naruto?\n.ai Write a JavaScript function");
    let loadingMsg;
    try {
      loadingMsg = await message.reply("🤖 | Thinking...");
      const config = (await axios.get(`${API_BASE}/api/links/gpt`, { timeout: 10000 })).data;
      const response = await axios.post(config.url, {
        model: config.model,
        messages: [{ role: "system", content: config.systemPrompt }, { role: "user", content: question }],
        temperature: config.temperature,
        max_tokens: config.maxTokens
      }, {
        headers: { Authorization: `${config.authPrefix}${config.apiKey}`, "Content-Type": "application/json", "HTTP-Referer": config.referer, "X-Title": config.xTitle },
        timeout: 60000
      });
      const answer = response.data?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error("AI returned an empty response.");
      if (loadingMsg?.messageID) await message.unsend(loadingMsg.messageID).catch(() => {});
      const chunks = [];
      for (let i = 0; i < answer.length; i += 19000) chunks.push(answer.slice(i, i+19000));
      for (const chunk of chunks) await message.reply(`🤖 𝐓𝐎𝐑𝐔-𝐂𝐇𝐀𝐍\n\n${chunk}`);
    } catch (error) {
      if (loadingMsg?.messageID) await message.unsend(loadingMsg.messageID).catch(() => {});
      const status = error.response?.status;
      let msg = "❌ | AI request failed.";
      if (status === 401) msg += "\n🔑 Invalid API key.";
      else if (status === 429) msg += "\n⏳ Rate limit. Please try again later.";
      else if (status >= 500) msg += "\n🔄 Server temporarily unavailable.";
      else msg += "\n🔄 Please try again.";
      return message.reply(msg);
    }
  }
};
