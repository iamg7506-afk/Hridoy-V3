module.exports = {
  config: {
    name: "out",
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 2,
    shortDescription: "বটকে গ্রুপ থেকে বের করে দেওয়া",
    longDescription: "এই কমান্ডের মাধ্যমে বটকে বর্তমান বা নির্দিষ্ট গ্রুপ থেকে বের করে দেওয়া হয়।",
    category: "Admin",
    guide: {
      en: "{pn} [threadID (optional)]",
    },
  },

  onStart: async function ({ api, event, args }) {
    const botID = api.getCurrentUserID();
    const targetThread = args[0] || event.threadID;

    try {
      await api.sendMessage("👋 𝗔𝗹𝘃𝗶𝗱𝗮, 𝗲𝘃𝗲𝗿𝘆𝗼𝗻𝗲! 💖\n\n ɪ'ᴍ ʟᴇᴀᴠɪɴɢ ᴛʜɪꜱ ɢʀᴏᴜᴘ ɴᴏᴡ.\nɪᴛ ᴡᴀꜱ ɴɪᴄᴇ ʙᴇɪɴɢ ᴡɪᴛʜ ʏᴏᴜ ᴀʟʟ.\n\nআবার দেখা হবে অন্য কোনো গ্রুপে!\n\n🌸 সবাই ভালো থাকবেন, সুস্থ থাকবেন।\n❤️ 𝗚𝗼𝗼𝗱𝗯𝘆𝗲 & 𝗧𝗮𝗸𝗲 𝗖𝗮𝗿𝗲!", targetThread);
      await api.removeUserFromGroup(botID, targetThread);
    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ বের হতে পারলাম না! হয়তো আমি অ্যাডমিন না বা কোনো সমস্যা হয়েছে।", event.threadID);
    }
  },
};
