const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";
const TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

// Cache the API config + template image (keyed by template url)
let cfgCache = null;
let templateCache = null;
let templateCacheUrl = null;

async function getConfig() {
  const { data } = await axios.get(`${BASE}/api/images/amarbondhu`);
  cfgCache = data;
  return data;
}

async function getTemplate(url) {
  if (templateCache && templateCacheUrl === url) return templateCache;
  const res = await axios.get(url, { responseType: "arraybuffer" });
  templateCache = await loadImage(Buffer.from(res.data));
  templateCacheUrl = url;
  return templateCache;
}

module.exports = {
  config: {
    name: "amarbondhu",
    aliases: ["12vatari"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 8,
    role: 0,
    description: {
      en: "Put someone's avatar into the meme template"
    },
    category: "Tag Fun",
    guide: {
      en: "{pn} @mention | reply to a message | {pn} (yourself)"
    }
  },

  langs: {
    en: {
      failed: "Could not generate the image. Try again later."
    }
  },

  onStart: async function ({ message, event, getLang }) {
    const mentionIds = Object.keys(event.mentions || {});
    const uid = event.messageReply
      ? event.messageReply.senderID
      : mentionIds[0] || event.senderID;

    const outPath = path.join(__dirname, "cache", `12vatari_${uid}_${Date.now()}.png`);

    try {
      const cfg = await getConfig();
      const BOX = cfg.positions.target;
      const size = cfg.avatarSize || 720;

      const [template, avatarRes] = await Promise.all([
        getTemplate(cfg.url),
        axios.get(
          `https://graph.facebook.com/${uid}/picture?width=${size}&height=${size}&access_token=${TOKEN}`,
          { responseType: "arraybuffer" }
        )
      ]);

      const avatar = await loadImage(Buffer.from(avatarRes.data));

      const canvas = createCanvas(template.width, template.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(template, 0, 0);

      const scale = Math.max(BOX.w / avatar.width, BOX.h / avatar.height);
      const sw = BOX.w / scale;
      const sh = BOX.h / scale;
      const sx = (avatar.width - sw) / 2;
      const sy = (avatar.height - sh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(BOX.x, BOX.y, BOX.w, BOX.h);
      ctx.clip();
      ctx.drawImage(avatar, sx, sy, sw, sh, BOX.x, BOX.y, BOX.w, BOX.h);
      ctx.restore();

      await fs.ensureDir(path.dirname(outPath));
      await fs.writeFile(outPath, canvas.toBuffer("image/png"));

      const msgs = cfg.messages || [];
      const body = msgs.length ? msgs[Math.floor(Math.random() * msgs.length)] : "";

      await message.reply(body
        ? { body, attachment: fs.createReadStream(outPath) }
        : { attachment: fs.createReadStream(outPath) });
    } catch (err) {
      console.error("[amarbondhu]", err);
      await message.reply(getLang("failed"));
    } finally {
      fs.remove(outPath).catch(() => {});
    }
  }
};
