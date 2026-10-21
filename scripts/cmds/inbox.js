module.exports = {
  config: {
    name: "inbox",
    aliases: ["in", "ইনবক্স"],
    version: "1.0.3",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Send a message to user's inbox 💌",
    category: "System",
    guide: { en: "{pn}" },
  },

  langs: {
    bn: {
      reply: "彡 💌 𝗜𝗡𝗕𝗢𝗫 𝗔𝗟𝗘𝗥𝗧 彡\n▸ ɪɴʙᴏxᴇ ᴍᴇssᴀɢᴇ ᴘᴀᴛʜᴀɴᴏ ʜᴏʟᴏ 🐤\n▸ ᴇᴋᴛᴜ ᴄʜᴇᴄᴋ ᴋᴏʀᴏ ʙᴇʙɪ 😘",
      inboxMsg: "彡 💌 𝗛𝗘𝗬 𝗕𝗔𝗕𝗬! 彡\n▸ ᴛᴏᴍᴀᴋᴇ ᴇᴋᴛᴀ ᴍᴇssᴀɢᴇ ᴘᴀᴛʜᴀɴᴏ ʜᴏʟᴏ 💕\n▸ ᴛᴜᴍɪ ᴋɪ ᴊᴀɴᴏ ᴋᴇ ᴘᴀᴛʜᴀʟᴏ? 👀\n✦ sᴇᴄʀᴇᴛ ᴀᴅᴍɪʀᴇʀ 😘✦",
      error: "彡 ❌ 𝗘𝗥𝗥𝗢𝗥 彡\n▸ %1",
    },
    en: {
      reply: "彡 💌 𝗜𝗡𝗕𝗢𝗫 𝗔𝗟𝗘𝗥𝗧 彡\n▸ ᴀ ᴍᴇssᴀɢᴇ ʜᴀs ʙᴇᴇɴ sᴇɴᴛ 🐤\n▸ ᴄʜᴇᴄᴋ ʏᴏᴜʀ ɪɴʙᴏx ʙᴀʙʏ 😘",
      inboxMsg: "彡 💌 𝗛𝗘𝗬 𝗕𝗔𝗕𝗬! 彡\n▸ ʏᴏᴜ ɢᴏᴛ ᴀ ᴍᴇssᴀɢᴇ 💕\n▸ ᴅᴏ ʏᴏᴜ ᴋɴᴏᴡ ᴡʜᴏ sᴇɴᴛ ɪᴛ? 👀\n✦ sᴇᴄʀᴇᴛ ᴀᴅᴍɪʀᴇʀ 😘 ✦",
      error: "彡 ❌ 𝗘𝗥𝗥𝗢𝗥 彡\n▸ %1",
    },
  },

  onStart: async function ({ api, event, message, getLang }) {
    try {
      await message.reply(getLang("reply"));
      await api.sendMessage(getLang("inboxMsg"), event.senderID);
    } catch (err) {
      console.error("Inbox error:", err);
      return message.reply(getLang("error", err.message));
    }
  },
};
