module.exports = {
  config: {
    name: "support",
    aliases: ["supportgc","helpgc", "supportgroup"],
    version: "3.2",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Join support group",
    longDescription: "Join official bot support group",
    category: "Utility",
    guide: "{pn}"
  },

  onStart: async function ({ api, event, message }) {

    const supportThread = "3853337894802519";
    const supportLink = "https://m.me/3853337894802519";

    const { senderID } = event;

    try {

      await api.addUserToGroup(senderID, supportThread);

      return message.reply(`
╭━━━〔 𝗕𝗢𝗧 𝗦𝗨𝗣𝗣𝗢𝗥𝗧 𝗖𝗘𝗡𝗧𝗘𝗥 〕━━━⬣

✅ Successfully added to the
official support group.

📌 If the group does not appear,
join manually using the link below.

🔗 SUPPORT LINK
${supportLink}

⚡ Available Services:
• Bot Setup Help
• Commands Support
• Bug Report
• File Share
• Custom Request

💖 Thanks for using our bot.

╰━━━━━━━━━━━━━━━━━━⬣
`);

    } catch (e) {

      return message.reply(`
╭━━━〔 𝗕𝗢𝗧 𝗦𝗨𝗣𝗣𝗢𝗥𝗧 𝗖𝗘𝗡𝗧𝗘𝗥 〕━━━⬣

⚠️ Auto add failed.

📌 Please join manually
using the support link below.

🔗 SUPPORT LINK
${supportLink}

🛠 Our Support Services:
• Bot Setup Help
• Command Request
• Error Fix
• Premium Help

💖 We are always ready to help.

╰━━━━━━━━━━━━━━━━━━⬣
`);

    }

  }
};
