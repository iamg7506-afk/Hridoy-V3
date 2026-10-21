const moment = require("moment-timezone");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

const CACHE_DIR = path.join(__dirname, "cache");
const TIMES_FILE = path.join(CACHE_DIR, "prayertimes.json");
const VIDEO_PATH = path.join(CACHE_DIR, "azan.mp4");
const VIDEO_URL_FILE = path.join(CACHE_DIR, "azan.url");

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

// ── Config from API (cached 10 min; stale copy kept if API is down) ──
let cfgCache = null, cfgAt = 0;
async function getCfg(force = false) {
  if (!force && cfgCache && Date.now() - cfgAt < 10 * 60 * 1000) return cfgCache;
  try {
    const { data } = await axios.get(`${BASE}/api/commands/prayerTimer`, { timeout: 20000 });
    cfgCache = data;
    cfgAt = Date.now();
  } catch (e) {
    console.error("❌ PrayerTimer API error:", e.message);
    if (!cfgCache) throw e;
  }
  return cfgCache;
}

// ── Timer management ──
function clearTimers() {
  if (global.__prayerTimers) {
    global.__prayerTimers.forEach(t => clearTimeout(t));
  }
  global.__prayerTimers = [];
  if (global.prayerTimerInterval) {
    clearInterval(global.prayerTimerInterval);
    global.prayerTimerInterval = null;
  }
}

function addTimer(fn, delay) {
  const t = setTimeout(fn, Math.max(0, delay));
  if (!global.__prayerTimers) global.__prayerTimers = [];
  global.__prayerTimers.push(t);
  return t;
}

// ── Prayer times ──
async function getTodayTimes(cfg, dateStr) {
  try {
    if (fs.existsSync(TIMES_FILE)) {
      const cached = fs.readJsonSync(TIMES_FILE);
      if (cached?.date === dateStr && cached?.times) {
        console.log("🕌 Cache theke prayer times load holo");
        return cached.times;
      }
    }
  } catch (_) {}

  console.log("🕌 API theke prayer times anchi...");
  const res = await axios.get(
    `https://api.aladhan.com/v1/timings/${dateStr}`,
    {
      timeout: 20000,
      params: {
        latitude: cfg.latitude,
        longitude: cfg.longitude,
        method: cfg.method,
        school: cfg.school,
        timezonestring: cfg.timezone,
      },
    }
  );

  const raw = res.data?.data?.timings;
  if (!raw) throw new Error("API response e timings nai");

  const times = {};
  for (const name of Object.keys(cfg.prayerLabels)) {
    const hhmm = String(raw[name]).trim().substring(0, 5);
    times[name] = moment
      .tz(`${dateStr} ${hhmm}`, "DD-MM-YYYY HH:mm", cfg.timezone)
      .add((cfg.adjustMinutes || {})[name] || 0, "minutes")
      .format("HH:mm");
  }

  fs.ensureDirSync(CACHE_DIR);
  fs.writeJsonSync(TIMES_FILE, { date: dateStr, times }, { spaces: 2 });
  console.log("🕌 Prayer times save holo:", times);
  return times;
}

// ── Video download ──
async function ensureVideo(cfg) {
  fs.ensureDirSync(CACHE_DIR);

  try {
    // Re-download if the API's video url changed
    const savedUrl = fs.existsSync(VIDEO_URL_FILE) ? fs.readFileSync(VIDEO_URL_FILE, "utf8") : "";
    if (savedUrl && savedUrl !== cfg.videoUrl && fs.existsSync(VIDEO_PATH)) fs.removeSync(VIDEO_PATH);

    if (fs.existsSync(VIDEO_PATH)) {
      const size = fs.statSync(VIDEO_PATH).size;
      if (size > 10000) {
        console.log("✅ Video cache e ache");
        return true;
      }
      fs.removeSync(VIDEO_PATH);
    }

    console.log("📥 Video download korchi...");
    const res = await axios({
      url: cfg.videoUrl,
      method: "GET",
      responseType: "arraybuffer",
      timeout: 120000,
    });

    fs.writeFileSync(VIDEO_PATH, Buffer.from(res.data));
    fs.writeFileSync(VIDEO_URL_FILE, cfg.videoUrl);
    console.log(`✅ Video download holo: ${fs.statSync(VIDEO_PATH).size} bytes`);
    return true;
  } catch (e) {
    console.error("❌ Video download problem:", e.message);
    if (fs.existsSync(VIDEO_PATH)) fs.removeSync(VIDEO_PATH);
    return false;
  }
}

// ── Get group IDs ──
function getGroupIDs() {
  try {
    const groups = ((global.db?.allThreadData) || [])
      .filter(t => t?.threadID && t?.isGroup === true)
      .map(t => String(t.threadID));
    console.log(`📋 Group pawa gelo: ${groups.length}ta`);
    return groups;
  } catch (e) {
    console.error("❌ Group ID ante problem:", e.message);
    return [];
  }
}

// ── Send prayer message ──
async function sendPrayer(api, prayerName, isJummah) {
  const cfg = await getCfg(true); // fresh text/video settings at send time
  const now = moment().tz(cfg.timezone);
  const label = isJummah ? cfg.jummahLabel : cfg.prayerLabels[prayerName];
  const dua = cfg.duas[Math.floor(Math.random() * cfg.duas.length)];

  const msg = fill(cfg.messageTemplate, {
    label,
    time: now.format("hh:mm A"),
    date: now.format("DD-MM-YYYY"),
    dua,
  });

  const hasVideo = await ensureVideo(cfg);
  const groups = getGroupIDs();

  if (groups.length === 0) {
    console.warn("⚠️ Kono group pawa jaina, message pathano gelo na");
    return;
  }

  let ok = 0, fail = 0;

  for (const threadID of groups) {
    try {
      const payload = { body: msg };

      // Har group er jonno alag stream create koro
      if (hasVideo && fs.existsSync(VIDEO_PATH)) {
        payload.attachment = fs.createReadStream(VIDEO_PATH);
      }

      await api.sendMessage(payload, threadID);
      ok++;
    } catch (e) {
      console.error(`❌ Group ${threadID} e pathate problem:`, e.message);
      fail++;
    }
    await sleep(cfg.sendGapMs);
  }

  console.log(`🕌 ${prayerName} (${now.format("hh:mm A")}) → ${ok} ok, ${fail} fail / ${groups.length} total`);
}

// ── Schedule today's prayers ──
async function scheduleToday(api) {
  clearTimers();

  let cfg;
  try {
    cfg = await getCfg(true);
  } catch (err) {
    console.error(`❌ Config ante problem: ${err.message}`);
    console.log("🔁 10 minute por abar try korbo...");
    addTimer(() => scheduleToday(api), 10 * 60 * 1000);
    return;
  }

  const TZ = cfg.timezone;
  const now = moment().tz(TZ);
  const dateStr = now.format("DD-MM-YYYY");

  let times;
  try {
    times = await getTodayTimes(cfg, dateStr);
  } catch (err) {
    console.error(`❌ Prayer time ante problem: ${err.message}`);
    console.log("🔁 10 minute por abar try korbo...");
    addTimer(() => scheduleToday(api), 10 * 60 * 1000);
    return;
  }

  const isFriday = now.day() === 5;
  const scheduled = [];

  for (const [name, hhmm] of Object.entries(times)) {
    const target = moment.tz(`${dateStr} ${hhmm}`, "DD-MM-YYYY HH:mm", TZ);
    const delay = target.diff(moment());

    if (delay <= 0) {
      console.log(`⏭️ ${name} (${hhmm}) ag-e pass hoye geche, skip`);
      continue;
    }

    scheduled.push(`${name}@${hhmm}`);
    addTimer(async () => {
      try {
        await sendPrayer(api, name, isFriday && name === "Dhuhr");
      } catch (e) {
        console.error(`❌ ${name} send error:`, e.message);
      }
    }, delay);
  }

  console.log(`✅ Prayer Timer active | ${dateStr} | Scheduled: ${scheduled.length ? scheduled.join(", ") : "kono baki nai"}`);

  // Next day 00:01 e refresh
  const nextDay = moment.tz(TZ).add(1, "day").startOf("day").add(1, "minute");
  const msUntilNextDay = nextDay.diff(moment());
  addTimer(() => scheduleToday(api), msUntilNextDay);
  console.log(`🔄 Next refresh: ${nextDay.format("DD-MM-YYYY HH:mm")} (${Math.round(msUntilNextDay / 3600000)}h later)`);
}

// ── Module exports ──
module.exports = {
  config: {
    name: "prayerTimer",
    version: "5.0",
    role: 0,
    author: "HR ID OY",
    description: "নামাজ টাইমে ভিডিও + Random Dua সহ মেসেজ যাবে (Jashore, Khulna)",
    category: "Utility",
    guide: "{pn}",
    countDown: 5,
  },

  onLoad: async function ({ api }) {
    console.log("🕌 Prayer Timer v5.0 loading...");
    try {
      const cfg = await getCfg(true);
      await ensureVideo(cfg); // pre-download on startup
    } catch (e) {
      console.error("Video pre-download fail:", e.message);
    }
    try {
      await scheduleToday(api);
    } catch (e) {
      console.error("❌ Prayer Timer onLoad error:", e.message);
    }
  },

  onStart: async function ({ message }) {
    try {
      const cfg = await getCfg();
      const now = moment().tz(cfg.timezone);
      const dateStr = now.format("DD-MM-YYYY");
      const times = await getTodayTimes(cfg, dateStr);
      const lines = Object.entries(times)
        .map(([n, t]) => `▸ ${n}: ${t}`)
        .join("\n");
      return message.reply(fill(cfg.scheduleTemplate, {
        date: now.format("DD-MM-YYYY"),
        locationName: cfg.locationName,
        lines,
      }));
    } catch (e) {
      return message.reply("❌ Prayer times ante problem: " + e.message);
    }
  },
};
