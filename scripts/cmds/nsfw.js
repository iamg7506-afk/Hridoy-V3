const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "nsfw", version: "2.1", author: "HR ID OY", countDown: 10, role: 0, shortDescription: "Interactive NSFW pic selector", category: "NSFW", guide: { bd: "{pn}" } },
  onStart: async function ({ message, event }) {
    const config = (await axios.get(`${API_BASE}/api/links/nsfw`, { timeout: 10000 })).data;
    const cats = config.categories;
    const listMsg = `😈 NSFW Category Select করো!\n\nAvailable:\n${cats.map(c=>`• ${c}`).join("\n")}\n\nReply করে category নাম লিখো 🔥\nExample: ass`;
    return message.reply(listMsg, (err, info) => {
      if (!err) global.GoatBot.onReply.set(info.messageID, { commandName: "nsfw", type: "select_category", messageID: info.messageID, author: event.senderID, config });
    });
  },
  onReply: async function ({ message, event, Reply, api }) {
    if (Reply.commandName !== "nsfw" || Reply.author !== event.senderID) return;
    const selected = Reply.config.categories.find(c => c === event.body.trim().toLowerCase());
    if (!selected) return message.reply(`Invalid! List থেকে একটা দাও।\nআবার reply করো।`);
    try {
      const res = await axios.get(`${Reply.config.url}${selected}`, { headers: { [Reply.config.authHeader]: Reply.config.apiKey }, timeout: 15000 });
      if (!res.data?.content?.url) return message.reply("Pic load হচ্ছে না 😔 Try again!");
      const attachment = await global.utils.getStreamFromURL(res.data.content.url);
      await api.sendMessage({ body: `🔞 ${selected.toUpperCase()} category থেকে random pic! 😈`, attachment }, event.threadID, event.messageID);
      global.GoatBot.onReply.delete(Reply.messageID);
    } catch (error) {
      return message.reply("❌ Error! Limit বা key issue হতে পারে।");
    }
  }
};
