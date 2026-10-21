const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const axios = require("axios");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

module.exports = {
  config: {
    role: 0,
    name: "help",
    aliases: ["menu"],
    version: "13.0",
    author: "HR ID OY",
    shortDescription: "Animated Help Menu With Category Filter",
    category: "System",
    guide: "{pn}help [command | all]"
  },

  onStart: async function ({ message, args, prefix, api }) {

    // ===== LOAD EVERYTHING FROM API =====
    let cfg;
    try {
      const { data } = await axios.get(`${BASE}/api/commands/help`, { timeout: 15000 });
      cfg = data;
    } catch (e) {
      console.error("Help API error:", e.message);
      return message.reply("❌ | API error, try again later.");
    }

    const commandsMap = global.GoatBot.commands;
    const categories = {};
    const commands = [];

    const categoryIcons = cfg.categoryIcons || {};
    const defaultIcon = cfg.defaultIcon || "📦";
    const allowedCategories = cfg.allowedCategories || [];
    const L = cfg.layout || {};
    const T = cfg.texts || {};

    const showAll = args[0] && args[0].toLowerCase() === "all";

    // ===== SINGLE COMMAND INFO =====
    if (args[0] && !showAll) {
      const cmd = commandsMap.get(args[0].toLowerCase());
      if (!cmd) return message.reply(fill(T.notFound || "❌ | Command not found! Try: {prefix}help all", { prefix }));

      return message.reply(
`彡 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 彡

  📌  𝗡𝗮𝗺𝗲       : ${cmd.config.name}
  🗂️  𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆    : ${categoryIcons[cmd.config.category] || defaultIcon} ${cmd.config.category}
  📝  𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻  : ${cmd.config.shortDescription || T.noDescription || "N/A"}
  💡  𝗨𝘀𝗮𝗴𝗲       : ${prefix}${cmd.config.name}
  🔖  𝗔𝗹𝗶𝗮𝘀𝗲𝘀      : ${cmd.config.aliases ? cmd.config.aliases.join(", ") : (T.noAliases || "None")}`
      );
    }

    // ===== BUILD CATEGORY SYSTEM =====
    for (let [name, cmd] of commandsMap) {
      const cat = cmd.config.category || "Others";

      if (!showAll && !allowedCategories.includes(cat)) continue;

      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(name);
      commands.push(name);
    }

    for (let cat in categories)
      categories[cat].sort();

    // ===== LOADING ANIMATION (PROGRESS BAR) =====
    const loadingFrames = cfg.loadingFrames;

    let loadingMsg;
    try {
      loadingMsg = await message.reply(loadingFrames[0]);
    } catch (e) {
      console.error("Failed to send loading message");
    }

    for (let i = 1; i < loadingFrames.length; i++) {
      await new Promise(res => setTimeout(res, cfg.loadingDelayMs || 400));
      if (loadingMsg) {
        try {
          await api.editMessage(loadingFrames[i], loadingMsg.messageID);
        } catch (e) {}
      }
    }

    // ===== TIME =====
    const tz = cfg.timezone || "Asia/Dhaka";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: tz });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: tz });

    // ===== UPTIME =====
    const uptimeSeconds = process.uptime();
    const upDays = Math.floor(uptimeSeconds / 86400);
    const upHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const upMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const upSeconds = Math.floor(uptimeSeconds % 60);
    const uptimeStr = `${upDays}d ${upHours}h ${upMinutes}m ${upSeconds}s`;

    let msg = `${L.title}\n\n`;
    msg += `   📦  𝗧𝗼𝘁𝗮𝗹 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 : ${commands.length}\n`;
    msg += `   🔑  𝗕𝗼𝘁 𝗣𝗿𝗲𝗳𝗶𝘅    : 『 ${prefix} 』\n`;
    msg += `   🟢  𝗦𝘁𝗮𝘁𝘂𝘀        : Active\n`;
    msg += `   📅  𝗗𝗮𝘁𝗲          : ${dateStr}\n`;
    msg += `   🕒  𝗧𝗶𝗺𝗲 (𝗕𝗗)     : ${timeStr}\n`;
    msg += `   ⏱️  𝗨𝗽𝘁𝗶𝗺𝗲       : ${uptimeStr}\n\n`;
    msg += `${L.divider}\n\n`;

    for (let [cat, cmds] of Object.entries(categories)) {
      const icon = categoryIcons[cat] || defaultIcon;
      msg += `┌─「 ${icon}  ${cat.toUpperCase()} 」\n`;

      for (let i = 0; i < cmds.length; i += 2) {
        const left = cmds[i];
        const right = cmds[i + 1];
        msg += right
          ? `│  ✧ ${left}   ✧ ${right}\n`
          : `│  ✧ ${left}\n`;
      }

      msg += `└───────────────\n\n`;
    }

    msg += `${L.infoTitle}\n\n`;
    msg += `   👤  𝗔𝗱𝗺𝗶𝗻    : ${L.admin}\n`;
    msg += `   📩  𝗥𝗲𝗽𝗼𝗿𝘁    : ${prefix}${L.reportCmd}\n`;
    msg += `   ℹ️  𝗖𝗺𝗱 𝗜𝗻𝗳𝗼 : ${prefix}help <command>\n`;
    msg += `   ⚡  𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 : ${L.poweredBy}`;

    // ===== RANDOM GIF (from API) =====
    const randomGifURL = cfg.gifs[Math.floor(Math.random() * cfg.gifs.length)];
    const gifFolder = path.join(__dirname, "cache");

    if (!fs.existsSync(gifFolder))
      fs.mkdirSync(gifFolder, { recursive: true });

    const gifPath = path.join(gifFolder, path.basename(randomGifURL));

    if (!fs.existsSync(gifPath)) {
      try {
        await downloadGif(randomGifURL, gifPath);
      } catch (err) {
        console.error("Failed to download GIF:", err);
      }
    }

    if (loadingMsg) {
      try {
        await api.unsendMessage(loadingMsg.messageID);
      } catch (e) {}
    }

    const sent = await message.reply({
      body: msg,
      attachment: fs.existsSync(gifPath) ? fs.createReadStream(gifPath) : null
    });

    // ===== AUTO DELETE =====
    setTimeout(() => {
      try {
        api.unsendMessage(sent.messageID);
      } catch (e) {}
    }, cfg.autoDeleteMs || 60000);
  }
};

// ===== DOWNLOAD FUNCTION =====
function downloadGif(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}
