const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const HRIDOY_API = "https://hridoy-api.vercel.app";
const IMAGE_NAME = "magi";

module.exports = {
  config: {
    name: "magi",
    aliases: ["maggi", "mg"],
    version: "4.0.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    category: "Tag Fun",
    shortDescription: "Profile picture roast with template",
    longDescription: "Reply বা mention করে profile pic roast করো!",
    guide: "{pn} [reply/mention] অথবা শুধু {pn}"
  },

  onStart: async function ({ api, event, message, usersData }) {
    const cache = path.join(__dirname, "cache");
    await fs.ensureDir(cache);

    const ts = Date.now();
    const outputPath   = path.join(cache, `magi_out_${ts}.jpg`);
    const templatePath = path.join(cache, `magi_tpl_${ts}.jpg`);
    const avatarPath   = path.join(cache, `magi_av_${ts}.jpg`);

    try {
      let templateUrl, facePos, msgTemplates;

      try {
        const cfgRes = await axios.get(
          `${HRIDOY_API}/api/images/${IMAGE_NAME}`,
          { timeout: 10000, headers: { "Accept": "application/json" } }
        );

        const cfg = cfgRes.data;
        if (!cfg.success || !cfg.url) {
          return message.reply(`❌ API তে "${IMAGE_NAME}" config পাওয়া যায়নি!`);
        }

        templateUrl  = cfg.url;
        facePos      = cfg.positions?.face;
        msgTemplates = cfg.messages || [];

        if (!facePos) {
          return message.reply("❌ API তে face position config নেই!");
        }

      } catch (e) {
        return message.reply("❌ API থেকে config নেওয়া যায়নি!\nError: " + e.message);
      }

      let targetID = event.senderID;

      if (event.messageReply?.senderID) {
        targetID = event.messageReply.senderID;
      }

      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      }

      let avatarURL = null;

      try {
        if (usersData && typeof usersData.getAvatarUrl === "function") {
          avatarURL = await usersData.getAvatarUrl(targetID);
        }
      } catch (e) {}

      if (!avatarURL) {
        try {
          const userInfo = await api.getUserInfo(targetID);
          if (userInfo?.[targetID]) {
            avatarURL = userInfo[targetID].avatarUrl || userInfo[targetID].profileUrl || null;
          }
        } catch (e) {}
      }

      if (!avatarURL) {
        return message.reply("❌ প্রোফাইল পিক পাওয়া যায়নি!\nএই user এর avatar Facebook API থেকে পাচ্ছি না।");
      }

      let userName = "তুই";
      try {
        const userInfo = await api.getUserInfo(targetID);
        if (userInfo?.[targetID]?.name) userName = userInfo[targetID].name;
      } catch (e) {}

      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      };

      const [templateRes, avatarRes] = await Promise.all([
        axios.get(templateUrl, { responseType: "arraybuffer", timeout: 30000, headers }),
        axios.get(avatarURL,   { responseType: "arraybuffer", timeout: 30000, headers })
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
      const size = Math.min(avatarImg.width, avatarImg.height);
      const cropX = (avatarImg.width - size) / 2;
      const cropY = (avatarImg.height - size) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, cropX, cropY, size, size, x, y, w, h);
      ctx.restore();

      await fs.writeFile(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.95 }));

      const rawMsg = msgTemplates[Math.floor(Math.random() * msgTemplates.length)] || "💀 {name}";

      const bodyText = rawMsg.replace(/\{name\}/g, userName);

      await message.reply({
        body: bodyText,
        attachment: fs.createReadStream(outputPath)
      });

      setTimeout(async () => {
        try {
          await fs.remove(outputPath);
          await fs.remove(templatePath);
          await fs.remove(avatarPath);
        } catch (e) {}
      }, 30000);

    } catch (error) {
      console.error("[MAGI] Error:", error);
      try {
        await fs.remove(outputPath);
        await fs.remove(templatePath);
        await fs.remove(avatarPath);
      } catch (e) {}
      return message.reply("❌ Magir image বানানো যায়নি!\nError: " + error.message);
    }
  }
};