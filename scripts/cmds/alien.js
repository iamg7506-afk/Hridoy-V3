const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const HRIDOY_API = "https://hridoy-api.vercel.app";
const IMAGE_NAME = "alien";

module.exports = {
  config: {
    name: "alien",
    aliases: ["spacealien"],
    version: "2.1",
    author: "HR ID OY",
    cooldowns: 5,
    role: 0,
    shortDescription: { en: "Alien canvas meme generator" },
    longDescription: { en: "Place user profile picture on alien image using reply, mention, or UID." },
    category: "Tag Fun",
    guide: { en: "{p}{n} [@mention / reply / UID]" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, mentions, messageReply, threadID, messageID } = event;

    const cache = path.join(__dirname, "cache");
    await fs.ensureDir(cache);

    const ts = Date.now();
    const outputPath   = path.join(cache, `alien_out_${ts}.png`);
    const templatePath = path.join(cache, `alien_tpl_${ts}.jpg`);
    const avatarPath   = path.join(cache, `alien_av_${ts}.jpg`);

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

     
      let templateUrl, facePos, msgTemplates;

      try {
        const cfgRes = await axios.get(
          `${HRIDOY_API}/api/images/${IMAGE_NAME}`,
          { timeout: 10000, headers: { "Accept": "application/json" } }
        );

        const cfg = cfgRes.data;
        if (!cfg.success || !cfg.url) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return message.reply(`❌ API তে "${IMAGE_NAME}" config পাওয়া যায়নি!`);
        }

        templateUrl  = cfg.url;
        facePos      = cfg.positions?.face;
        msgTemplates = cfg.messages || [];

        if (!facePos) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return message.reply("❌ API তে face position config নেই!");
        }

      } catch (e) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply("❌ API থেকে config নেওয়া যায়নি!\nError: " + e.message);
      }

      let targetID;

      if (messageReply) {
        targetID = messageReply.senderID;
      } else if (mentions && Object.keys(mentions).length > 0) {
        targetID = Object.keys(mentions)[0];
      } else if (args[0] && !isNaN(args[0])) {
        targetID = args[0];
      } else {
        targetID = senderID;
      }

      const userInfo = await api.getUserInfo(targetID);
      const userName = userInfo[targetID]?.name || "Friend";

      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      };

      const avatarUrl = `https://graph.facebook.com/${targetID}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [templateRes, avatarRes] = await Promise.all([
        axios.get(templateUrl, { responseType: "arraybuffer", timeout: 30000, headers }),
        axios.get(avatarUrl,   { responseType: "arraybuffer", timeout: 30000, headers })
          .catch(() => axios.get("https://i.ibb.co/4pDNDR1/avatar.png", { responseType: "arraybuffer", headers }))
      ]);

      await Promise.all([
        fs.writeFile(templatePath, templateRes.data),
        fs.writeFile(avatarPath,   avatarRes.data)
      ]);

      const templateImg = await loadImage(templatePath);
      const avatarImg   = await loadImage(avatarPath);

      const canvas = createCanvas(templateImg.width, templateImg.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

      const { x, y, w, h } = facePos;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, x, y, w, h);
      ctx.restore();

      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(outputPath, buffer);

      const rawMsg = msgTemplates[Math.floor(Math.random() * msgTemplates.length)]
        || "👾 {name} এলিয়েন! 🪐";

      const bodyText = rawMsg.replace(/\{name\}/g, userName);

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(
        {
          body: bodyText,
          attachment: fs.createReadStream(outputPath)
        },
        threadID,
        () => {
          setTimeout(async () => {
            try {
              await fs.remove(outputPath);
              await fs.remove(templatePath);
              await fs.remove(avatarPath);
            } catch (e) {}
          }, 30000);
        },
        messageID
      );

    } catch (error) {
      console.error("[ALIEN] Error:", error);
      api.setMessageReaction("❌", messageID, () => {}, true);

      try {
        await fs.remove(outputPath);
        await fs.remove(templatePath);
        await fs.remove(avatarPath);
      } catch (e) {}

      return message.reply("❌ Alien image বানানো যায়নি!\nError: " + error.message);
    }
  }
};
