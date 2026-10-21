module.exports = {
  config: {
    name: "emoji",
    version: "1.1.1",
    author: "HR ID OY",
    countDown: 0,
    role: 0,
    shortDescription: "Change group emoji 😘",
    longDescription: "Messenger গ্রুপের ইমোজি (Quick Reaction) পরিবর্তন করো মাত্র এক কমান্ডে!",
    category: "Group",
    guide: "{pn} 😘"
  },

  onStart: async function ({ api, event, args }) {
    const emoji = args.join(" ");

    // ⚠️ যদি কোনো ইমোজি না দেয়
    if (!emoji) {
      return api.sendMessage("❌ | দয়া করে একটি ইমোজি দিন! উদাহরণ: /emoji 😘", event.threadID, event.messageID);
    }

    try {
      // ✅ গ্রুপ ইমোজি পরিবর্তন
      await api.changeThreadEmoji(emoji, event.threadID);
      return api.sendMessage(`✅ | গ্রুপ ইমোজি সফলভাবে পরিবর্তন হয়েছে ${emoji} এ!`, event.threadID, event.messageID);
    } catch (err) {
      console.error(err);
      return api.sendMessage("⚠️ | ইমোজি পরিবর্তনে সমস্যা হয়েছে, আবার চেষ্টা করুন!", event.threadID, event.messageID);
    }
  }
};
