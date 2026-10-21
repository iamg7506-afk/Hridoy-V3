const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const axios = require("axios");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

// 🔒 anti double trigger lock
const running = new Set();

const prefixFile = path.join(__dirname, "prefixData.json");

const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

// ---- Config from API (cached 5 min, stale copy used if API is down) ----
let cfgCache = null, cfgAt = 0;
async function getCfg() {
  if (cfgCache && Date.now() - cfgAt < 5 * 60 * 1000) return cfgCache;
  try {
    const { data } = await axios.get(`${BASE}/api/commands/prefix`, { timeout: 15000 });
    cfgCache = data;
    cfgAt = Date.now();
  } catch (e) {
    console.error("Prefix API error:", e.message);
    if (!cfgCache) throw e;
  }
  return cfgCache;
}

function ensurePrefixFile() {
  if (!fs.existsSync(prefixFile)) {
    fs.writeFileSync(prefixFile, JSON.stringify({}, null, 2));
  }
}

// ---- Shared function: always returns the ACTUAL current prefix for a thread ----
function getCurrentPrefix(threadID) {
  ensurePrefixFile();
  try {
    const data = JSON.parse(fs.readFileSync(prefixFile));
    return data[threadID] || global.GoatBot.config.prefix || ".";
  } catch (e) {
    return global.GoatBot.config.prefix || ".";
  }
}

function setPrefix(threadID, newPrefix) {
  ensurePrefixFile();
  const data = JSON.parse(fs.readFileSync(prefixFile));
  data[threadID] = newPrefix;
  fs.writeFileSync(prefixFile, JSON.stringify(data, null, 2));
}

// ================= SHARED: "prefix" -> loading animation + gif + info card =================
async function showPrefixInfo({ message, event, api }) {
  const key = event.threadID;
  if (running.has(key)) return;
  running.add(key);
  setTimeout(() => running.delete(key), 5000);

  let cfg;
  try {
    cfg = await getCfg();
  } catch (e) {
    running.delete(key);
    return message.reply("❌ | API error, try again later.");
  }

  const botPrefix = global.GoatBot.config.prefix || ".";
  const groupPrefix = getCurrentPrefix(event.threadID);

  const ping = Date.now() - event.timestamp;
  const day = new Date().toLocaleString("en-US", { weekday: "long" });
  const botName = global.GoatBot.config.nickNameBot || cfg.defaultBotName || "KakashiBot";

  const randomLoadingSet = cfg.loadingSets[Math.floor(Math.random() * cfg.loadingSets.length)];
  const randomGifUrl = cfg.gifs[Math.floor(Math.random() * cfg.gifs.length)];
  const randomText = fill(
    cfg.textFrames[Math.floor(Math.random() * cfg.textFrames.length)],
    { ping, day, botPrefix, groupPrefix, botName }
  );

  const msg = await message.reply(randomLoadingSet[0]);

  for (let i = 1; i < randomLoadingSet.length; i++) {
    await new Promise(r => setTimeout(r, 1000));
    api.editMessage(randomLoadingSet[i], msg.messageID);
  }

  await new Promise(r => setTimeout(r, 700));
  api.unsendMessage(msg.messageID);

  const cacheFolder = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);

  const gifName = path.basename(randomGifUrl);
  const gifPath = path.join(cacheFolder, gifName);

  if (!fs.existsSync(gifPath)) {
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(gifPath);
      https.get(randomGifUrl, res => {
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      }).on("error", reject);
    });
  }

  running.delete(key);

  return api.sendMessage({
    body: randomText,
    attachment: fs.createReadStream(gifPath)
  }, event.threadID);
}

// ================= SHARED: "prefix set <newPrefix>" =================
async function handleSetPrefix({ message, event, api, args, threadsData }) {
  const key = event.threadID;
  if (running.has(key)) return;
  running.add(key);
  setTimeout(() => running.delete(key), 5000);

  let texts = {};
  try { texts = (await getCfg()).texts || {}; } catch (_) {}

  const newPrefix = args[1];

  if (!newPrefix) {
    running.delete(key);
    return message.reply(texts.setUsage || "❌ | Example: prefix set !");
  }

  // ---- Admin-only check (group admin OR bot admin) ----
  let isAdmin = false;
  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const isGroupAdmin = threadInfo.adminIDs?.some(a => a.id == event.senderID);
    const isBotAdmin = global.GoatBot.config.adminBot?.includes(event.senderID);
    isAdmin = isGroupAdmin || isBotAdmin;
  } catch (e) {
    isAdmin = global.GoatBot.config.adminBot?.includes(event.senderID);
  }

  if (!isAdmin) {
    running.delete(key);
    return message.reply(texts.notAdmin || "❌ | Admin only.");
  }

  // ---- Only change THIS thread's prefix, never global ----
  setPrefix(event.threadID, newPrefix);

  if (threadsData) {
    try {
      await threadsData.set(event.threadID, newPrefix, "data.prefix");
    } catch (e) {}
  }

  running.delete(key);
  return message.reply(fill(texts.setSuccess || "✅ Prefix changed!\nNew Prefix: {prefix}", { prefix: newPrefix }));
}

module.exports = {
  config: {
    name: "prefix",
    version: "22.0",
    author: "HR ID OY",
    description: "Full prefix system with random animation + gif — works with no bot prefix needed",
    category: "Utility",
    role: 0,
    // 🔑 REQUIRED so "prefix" and "prefix set <newPrefix>" work WITHOUT the bot prefix
    usePrefix: false,
    guide: {
      en: "prefix -> show prefix info with animation (no bot prefix needed)\nprefix set <newPrefix> -> change prefix for this group (admin only)"
    }
  },

  onStart: async function ({ message, event, api, args, threadsData }) {
    if (args[0] === "set") {
      return handleSetPrefix({ message, event, api, args, threadsData });
    }
    return showPrefixInfo({ message, event, api });
  },

  // ================= NO-PREFIX SAFETY NET =================
  onChat: async function ({ event, message, api, threadsData }) {
    if (!event.body) return;

    const body = event.body.trim();
    const lower = body.toLowerCase();

    // "prefix set <newPrefix>" typed with no bot prefix at all
    const setMatch = lower.match(/^prefix\s+set\s+(\S+)$/);
    if (setMatch) {
      return handleSetPrefix({
        message, event, api, threadsData,
        args: ["set", body.split(/\s+/)[2]]
      });
    }

    // bare word "prefix" typed with no bot prefix at all
    if (lower === "prefix") {
      return showPrefixInfo({ message, event, api });
    }

    // ---- ALWAYS read the ACTUAL live prefix for this thread, never hardcoded ----
    const currentPrefix = getCurrentPrefix(event.threadID);

    // Only reply if the ENTIRE message is exactly the current prefix, nothing else
    if (body === currentPrefix) {
      return message.reply("");
    }
  }
};
