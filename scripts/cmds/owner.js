const fs = require("fs-extra");
const request = require("request");
const path = require("path");
const { utils } = global;

module.exports = {
  config: {
    name: "owner",
    version: "2.2",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Owner information with animation",
    category: "Utility",
    guide: { en: "owner" }
  },

  onStart: async function ({ api, event }) {

    // ===== LOADING ANIMATION =====
    const loadingStages = [
      "𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐎𝐰𝐧𝐞𝐫 𝐈𝐧𝐟𝐨...\n▰▱▱▱▱▱▱▱▱▱ 10%",
      "𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐎𝐰𝐧𝐞𝐫 𝐈𝐧𝐟𝐨...\n▰▰▰▱▱▱▱▱▱▱ 30%",
      "𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐎𝐰𝐧𝐞𝐫 𝐈𝐧𝐟𝐨...\n▰▰▰▰▰▱▱▱▱▱ 50%",
      "𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐎𝐰𝐧𝐞𝐫 𝐈𝐧𝐟𝐨...\n▰▰▰▰▰▰▰▱▱▱ 70%",
      "𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐎𝐰𝐧𝐞𝐫 𝐈𝐧𝐟𝐨...\n▰▰▰▰▰▰▰▰▰▱ 90%",
      "𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐎𝐰𝐧𝐞𝐫 𝐈𝐧𝐟𝐨...\n▰▰▰▰▰▰▰▰▰▰ 100%"
    ];

    const loadingMsg = await api.sendMessage(loadingStages[0], event.threadID);

    for (let i = 1; i < loadingStages.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      await api.editMessage(loadingStages[i], loadingMsg.messageID);
    }

    setTimeout(() => {
      api.unsendMessage(loadingMsg.messageID);
    }, 1000);

    // ===== STATS =====
    const ping = Date.now() - event.timestamp;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const totalThreads = global.GoatBot?.allThreadID?.length || 0;
    const totalUsers = global.GoatBot?.users
      ? Object.keys(global.GoatBot.users).length
      : 0;

    const BOTNAME = global.GoatBot.config.nickNameBot || "KakashiBot";
    const BOTPREFIX = global.GoatBot.config.prefix;
    const GROUPPREFIX = utils.getPrefix(event.threadID);
    const totalCommands = global.GoatBot.commands.size;

    // ===== TEXT =====
    const ownerText =
`╔════════════════════╗
   🌟 B O T   S Y S T E M 🌟
╚════════════════════╝

➢ Bot Name     : ${BOTNAME}
➢ Prefix       : ${BOTPREFIX}
➢ Group Prefix : ${GROUPPREFIX}
➢ Total Cmds   : ${totalCommands}
➢ Ping         : ${ping} ms ⚡

╔════════════════════╗
    👑 O W N E R   I N F O
╚════════════════════╝

➢ Name     : HR ID OY
➢ Role     : Bot Developer
➢ Facebook : fb.me/dukkhobilash827642
➢ Instagram: dukkhobilash____827642
➢ WhatsApp :+8801744-******

╔════════════════════╗
     📊 B O T   S T A T S
╚════════════════════╝

➢ Uptime       : ${hours}h ${minutes}m ${seconds}s
➢ Total Groups : ${totalThreads}
➢ Total Users  : ${totalUsers}

━━━━━━━━━━━━━━━━━━━━━━━
   ✨ Powered By HR ID OY ✨
━━━━━━━━━━━━━━━━━━━━━━━`;

    // ===== IMAGE FIX (STABLE) =====
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const imgPath = path.join(cacheDir, "owner.jpg");
    const imgLink = "https://i.imgur.com/3RMAJwi.jpeg";

    const downloadImage = () => {
      return new Promise((resolve, reject) => {
        request({ url: imgLink, encoding: null })
          .pipe(fs.createWriteStream(imgPath))
          .on("finish", resolve)
          .on("error", reject);
      });
    };

    try {
      await downloadImage();

      await api.sendMessage(
        {
          body: ownerText,
          attachment: fs.createReadStream(imgPath)
        },
        event.threadID
      );

      fs.unlinkSync(imgPath);
    } catch (err) {
      console.error("Owner command error:", err);
      api.sendMessage(ownerText, event.threadID);
    }
  }
};