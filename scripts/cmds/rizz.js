const axios = require("axios");
const jimp = require("jimp");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const API_BASE = "https://hridoy-api.vercel.app";

async function loadAndRoundImage(url) {
  const avatar = await jimp.read(url);
  avatar.circle();
  const buf = await avatar.getBufferAsync(jimp.MIME_PNG);
  return loadImage(buf);
}

// The old code fetched avatars via graph.facebook.com/{id}/picture using a
// hardcoded legacy app access token (6628568379|c1e620...). Meta discontinued
// anonymous access through that token, so every call here was throwing and
// tripping the framework's generic error handler. We use the bot framework's
// own avatar helpers instead, same as cockroach.js already does successfully.
async function getAvatarUrl(uid, { usersData, api } = {}) {
  if (usersData?.getAvatarUrl) {
    try {
      const url = await usersData.getAvatarUrl(uid);
      if (url) return url;
    } catch {}
  }
  try {
    const info = await api.getUserInfo(uid);
    if (info?.[uid]?.avatarUrl) return info[uid].avatarUrl;
    if (info?.[uid]?.thumbSrc) return info[uid].thumbSrc;
  } catch {}
  return null;
}

module.exports = {
  config: { name: "rizz", version: "2.3", author: "HR ID OY", countDown: 10, role: 0, shortDescription: "rizz the girls", category: "Love", guide: { en: "{p}rizz @mention" } },
  onStart: async function ({ message, event, api, usersData }) {
    try {
      const mention = Object.keys(event.mentions || {});
      if (!mention.length) return message.reply("please mention someone");

      const one = event.senderID, two = mention[0];
      const mentionName = event.mentions[mention[0]].split(" ")[0].replace("@", "");

      const [avatarOneUrl, avatarTwoUrl] = await Promise.all([
        getAvatarUrl(one, { usersData, api }),
        getAvatarUrl(two, { usersData, api })
      ]);
      if (!avatarOneUrl || !avatarTwoUrl) {
        return message.reply("❌ Couldn't fetch one of the profile pictures. Try again in a bit.");
      }

      const config = (await axios.get(`${API_BASE}/api/links/rizz`, { timeout: 15000 })).data;
      const imgConfig = (await axios.get(`${API_BASE}/api/images/rizzbg`, { timeout: 15000 })).data;

      let pickupLine = "Are you a magician? Because whenever I look at you, everyone else disappears.";
      try {
        const pickupRes = await axios.get(config.url, { timeout: 10000 });
        pickupLine = pickupRes.data?.[config.responseKey] || pickupLine;
      } catch {
        // upstream pickup-line API down — fall back silently to the default line
      }

      const [bg, avOne, avTwo] = await Promise.all([
        loadImage(imgConfig.url),
        loadAndRoundImage(avatarOneUrl),
        loadAndRoundImage(avatarTwoUrl)
      ]);

      const canvas = createCanvas(600, 300);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
      const pos = imgConfig.positions;
      ctx.drawImage(avOne, pos.sender.x, pos.sender.y, pos.sender.w, pos.sender.h);
      ctx.drawImage(avTwo, pos.target.x, pos.target.y, pos.target.w, pos.target.h);
      const tp = imgConfig.textPosition;
      ctx.font = tp.font; ctx.fillStyle = tp.color;
      ctx.fillText(`${mentionName} ${pickupLine}`, tp.x, tp.y);

      const imagePath = `rizz_${Date.now()}.png`;
      const out = fs.createWriteStream(imagePath);
      canvas.createPNGStream().pipe(out);
      await new Promise((resolve, reject) => { out.once("finish", resolve); out.once("error", reject); });

      await message.reply({ body: "", attachment: fs.createReadStream(imagePath) });
      fs.unlink(imagePath, () => {});
    } catch (err) {
      console.error("[rizz] error:", err?.message || err);
      return message.reply("❌ Something went wrong generating the rizz image. Please try again later.");
    }
  }
};
