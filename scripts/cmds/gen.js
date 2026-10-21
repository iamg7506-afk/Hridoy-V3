const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ── API base (only this URL lives here) ──
const GATEWAY = "https://hridoy-api.vercel.app";
const TIMEOUT = 300_000;

const EMOJI = { wait: "⏳", work: "⚙️", done: "✅", fail: "❌" };

const RATIOS = new Set([
  "1:1", "16:9", "9:16", "4:3", "3:4",
  "3:2", "2:3", "21:9", "4:5", "5:4",
]);

const ALIASES = {
  nb2: "nano-banana-2",
  nanobanana: "nano-banana-2",
  nanobanana2: "nano-banana-2",
  nb2edit: "nano-banana-2-edit",
  gpt2: "gpt-image-2-low",
  gptimage2: "gpt-image-2-low",
  gpt2edit: "gpt-image-2-edit",
  flux2: "flux-2-dev",
  flux2dev: "flux-2-dev",
  flux2edit: "flux-2-dev-edit",
  flux2flex: "flux-2-flex",
  flux2pro: "flux-2-pro",
  flux2proedit: "flux-2-pro-edit",
  fluxkrea: "flux-krea",
  fluxkreaedit: "flux-krea-edit",
  kontext: "flux-kontext-dev",
  ideogram: "ideogram-v3-turbo",
  seedream4: "seedream-4",
  seedream4edit: "seedream-4-edit",
  seedream45: "seedream-4-5",
  seedream45edit: "seedream-4-5-edit",
  seedream5: "seedream-5",
  seedream5edit: "seedream-5-edit",
  qwen2: "qwen-image-2",
  qwen2pro: "qwen-image-2-pro",
  gemini25: "gemini-2-5-flash-image",
  gemini25edit: "gemini-2-5-flash-image-edit",
  flare: "gpt-image-2-5-flare-low",
  flareedit: "gpt-image-2-5-flare-low-edit",
  sunburst: "gpt-image-2-5-sunburst-low",
  sunburstedit: "gpt-image-2-5-sunburst-low-edit",
  gpt25: "gpt-image-2-5-flare-low",
  gpt25flare: "gpt-image-2-5-flare-low",
  gpt25sunburst: "gpt-image-2-5-sunburst-low",
};

const MUSIC_VERSIONS = ["v3.5", "v4.0"];

// ─── LAZY GATEWAY-BACKED HTTP CLIENT ──────────────────────────────────────────
// Fetches base URL + API key from config/apis.json (links.nkxgen) via the
// gateway on first use, then reuses the same axios client afterwards.
let _client = null;
async function getClient() {
  if (_client) return _client;
  const { data: cfg } = await axios.get(`${GATEWAY}/api/links/nkxgen`);
  _client = axios.create({
    baseURL: cfg.url,
    timeout: TIMEOUT,
    validateStatus: () => true,
    headers: { [cfg.authHeader || "X-Api-Key"]: cfg.apiKey },
  });
  return _client;
}

// ─── MODEL CACHE ──────────────────────────────────────────────────────────────
let _models = {};

async function getModels() {
  if (Object.keys(_models).length) return _models;
  const client = await getClient();
  const res = await client.get("/api/models");
  if (res.status >= 400 || typeof res.data?.models !== "object") {
    throw new Error("Model list load করা যায়নি। NKX GEN API সাড়া দিচ্ছে না।");
  }
  _models = res.data.models;
  return _models;
}

// ─── MODEL PICKER ─────────────────────────────────────────────────────────────
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

function pickModel(flag) {
  const q = norm(flag.replace(/^--/, ""));
  if (!q) return null;

  if (ALIASES[q]) return ALIASES[q];

  const keys = Object.keys(_models);

  const exact = keys.find((k) => norm(k) === q);
  if (exact) return exact;

  const starts = keys.filter((k) => norm(k).startsWith(q));
  if (starts.length) return starts.sort((a, b) => a.length - b.length)[0];

  const contains = keys.filter((k) => norm(k).includes(q));
  if (contains.length) return contains.sort((a, b) => a.length - b.length)[0];

  return null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function react(messenger, msgID, emoji) {
  try { messenger.setMessageReaction(emoji, msgID); } catch (_) {}
}

function formatError(res) {
  const d = res.data;
  if (d && typeof d === "object") {
    if (typeof d.detail === "object" && !Array.isArray(d.detail))
      return d.detail?.error || d.error || "Balance যথেষ্ট নেই।";
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.detail)) return d.detail.map((x) => x.msg || x).join("; ");
    if (d.error) return d.error;
    if (d.hint) return d.hint;
  }
  const STATUS_MSGS = {
    401: "API key গ্রহণ করা হয়নি।",
    402: "এই মুহূর্তে credit নেই। একটু পরে চেষ্টা করুন।",
    504: "সময়সীমা শেষ। আবার চেষ্টা করুন।",
    502: "সার্ভার জেগে উঠছে। একটু পরে চেষ্টা করুন।",
    503: "সার্ভার জেগে উঠছে। একটু পরে চেষ্টা করুন।",
  };
  return STATUS_MSGS[res.status] || `Request ব্যর্থ হয়েছে (status ${res.status})।`;
}

function getFlag(args, names) {
  const low = names.map((n) => n.toLowerCase());
  for (let i = 0; i < args.length; i++) {
    if (low.includes(args[i].toLowerCase())) {
      const val = args[i + 1];
      if (!val || val.startsWith("--")) return { found: true, value: null, index: i };
      return { found: true, value: val, index: i };
    }
  }
  return { found: false, value: null, index: -1 };
}

function extractImageUrl(event) {
  const sources = [event.messageReply?.attachments, event.attachments];
  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    const photo = list.find((a) => a.type === "photo" || a.type === "sticker");
    if (photo) {
      const url = photo.url || photo.largePreviewUrl || photo.previewUrl;
      if (url) return url;
    }
  }
  return null;
}

async function downloadFile(url) {
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const ext = (url.split("?")[0].split(".").pop() || "jpg").slice(0, 4);
  const filePath = path.join(cacheDir, `gen_${Date.now()}.${ext}`);
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 120_000 });
  await fs.writeFile(filePath, Buffer.from(res.data));
  return filePath;
}

// ─── MUSIC GENERATION ────────────────────────────────────────────────────────
async function handleMusic({ messenger, message, event, prompt, versionFlag }) {
  const version = versionFlag.value || "v3.5";
  if (!MUSIC_VERSIONS.includes(version)) {
    react(messenger, event.messageID, EMOJI.fail);
    return message.reply(`অজানা music version "${version}"। Available: ${MUSIC_VERSIONS.join(", ")}`);
  }

  react(messenger, event.messageID, EMOJI.work);
  try {
    const client = await getClient();
    const res = await client.post("/api/music", { prompt, model: version, wait: true });
    if (res.status >= 400) {
      react(messenger, event.messageID, EMOJI.fail);
      return message.reply(formatError(res));
    }
    const url = res.data?.audio_url || res.data?.cover;
    if (!url) {
      react(messenger, event.messageID, EMOJI.fail);
      return message.reply("Music তৈরি হয়েছে কিন্তু কোনো file পাঠানো হয়নি।");
    }
    const filePath = await downloadFile(url);
    react(messenger, event.messageID, EMOJI.done);
    await message.reply({ body: res.data?.title || prompt, attachment: fs.createReadStream(filePath) });
    fs.remove(filePath).catch(() => {});
  } catch (e) {
    console.error("[GEN MUSIC ERROR]:", e?.response?.data || e.message || e);
    react(messenger, event.messageID, EMOJI.fail);
    message.reply("Music generate করতে গিয়ে error হয়েছে। আবার চেষ্টা করুন।");
  }
}

// ─── MODULE EXPORT ────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "gen",
    version: "4.0",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    shortDescription: { en: "NKX GEN দিয়ে ছবি ও সংগীত তৈরি করুন" },
    longDescription: {
      en: "যেকোনো NKX GEN model দিয়ে image বা music generate করুন। ছবিতে reply করলে সেটি reference হিসেবে ব্যবহার হবে।",
    },
    category: "AI",
    guide: {
      en:
        "{pn} --nb2 a cat --ar 16:9\n" +
        "{pn} --gpt2 a robot --ar 1:1\n" +
        "{pn} --seedream5 a city at night\n" +
        "(ছবিতে reply করুন) {pn} --nb2 make it watercolor\n" +
        "{pn} --music a lo-fi beat\n" +
        "{pn} --models",
    },
  },

  onStart: async function ({ api: messenger, message, event, args }) {
    if (!args.length) {
      return message.reply(
        "ব্যবহার:\n" +
        "• gen --nb2 a cat --ar 16:9\n" +
        "• gen --gpt2 a robot\n" +
        "• gen --seedream5 a city at night\n" +
        "• (ছবিতে reply) gen --nb2 make it watercolor\n" +
        "• gen --music a lo-fi beat\n" +
        "• gen --models  ← সব model দেখুন"
      );
    }

    const first = args[0].toLowerCase();
    const flags = args.filter((a) => a.startsWith("--"));
    const isMusic = flags.includes("--music") || flags.includes("--audio");

    if (first === "--models") {
      react(messenger, event.messageID, EMOJI.wait);
      try {
        const models = await getModels();
        const lines = Object.entries(models).slice(0, 40).map(([alias, id]) => `• ${alias} → ${id}`);
        react(messenger, event.messageID, EMOJI.done);
        return message.reply(`NKX GEN Models:\n${lines.join("\n")}\n\nব্যবহার: gen --<alias> <prompt>`);
      } catch (e) {
        react(messenger, event.messageID, EMOJI.fail);
        return message.reply(e.message);
      }
    }

    const arFlag = getFlag(args, ["--ar"]);
    const imageFlag = getFlag(args, ["--image", "--img", "--url"]);
    const versionFlag = getFlag(args, ["--version"]);

    const SPECIAL_FLAGS = new Set(["--ar", "--music", "--audio", "--image", "--img", "--url", "--version"]);
    const modelFlag = flags.find((f) => !SPECIAL_FLAGS.has(f.toLowerCase()));

    if (!modelFlag && !isMusic) {
      return message.reply("কোনো model বেছে নিন। যেমন: gen --nb2 a cat\nসব model দেখতে: gen --models");
    }

    const usedTokens = new Set();
    if (modelFlag) usedTokens.add(modelFlag);
    for (const f of [arFlag, imageFlag, versionFlag]) {
      if (f.found) {
        usedTokens.add(args[f.index]);
        if (f.value !== null) usedTokens.add(args[f.index + 1]);
      }
    }
    const prompt = args.filter((a) => !usedTokens.has(a) && !a.startsWith("--")).join(" ").trim();

    if (!prompt) return message.reply("Prompt দিন। যেমন: gen --nb2 a cat");

    react(messenger, event.messageID, EMOJI.wait);

    try {
      await getModels();
    } catch (e) {
      react(messenger, event.messageID, EMOJI.fail);
      return message.reply(e.message);
    }

    if (isMusic) {
      return handleMusic({ messenger, message, event, prompt, versionFlag });
    }

    const model = pickModel(modelFlag);
    if (!model) {
      react(messenger, event.messageID, EMOJI.fail);
      return message.reply(`"${modelFlag.slice(2)}" নামের model পাওয়া যায়নি।\nসব model দেখতে: gen --models`);
    }

    const ratio = arFlag.value && RATIOS.has(arFlag.value) ? arFlag.value : "1:1";
    const reference = extractImageUrl(event) || imageFlag.value || null;

    if (reference && !/^https?:\/\//i.test(reference)) {
      react(messenger, event.messageID, EMOJI.fail);
      return message.reply("Image URL পড়া যায়নি। ছবিতে reply করে চেষ্টা করুন।");
    }

    const payload = { prompt, model, ratio, resolution: "2k", wait: true };
    if (reference) payload.image_urls = [reference];

    try {
      react(messenger, event.messageID, EMOJI.work);
      const client = await getClient();
      const res = await client.post("/api/generate", payload);
      if (res.status >= 400) {
        react(messenger, event.messageID, EMOJI.fail);
        return message.reply(formatError(res));
      }
      const url = res.data?.url || res.data?.thumbnail;
      if (!url) {
        react(messenger, event.messageID, EMOJI.fail);
        return message.reply("Generation শেষ হয়েছে কিন্তু কোনো file পাঠানো হয়নি।");
      }
      const filePath = await downloadFile(url);
      react(messenger, event.messageID, EMOJI.done);
      await message.reply({ attachment: fs.createReadStream(filePath) });
      fs.remove(filePath).catch(() => {});
    } catch (e) {
      console.error("[GEN IMAGE ERROR]:", e?.response?.data || e.message || e);
      react(messenger, event.messageID, EMOJI.fail);
      message.reply("Image generate করতে গিয়ে error হয়েছে। আবার চেষ্টা করুন।");
    }
  },
};
