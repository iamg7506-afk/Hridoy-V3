const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "cockroach";

module.exports = {
  config: {
    name: "cockroach", version: "2.3", author: "HR ID OY",
    countDown: 5, role: 0, category: "Tag Fun",
    shortDescription: "Profile picture roast with cockroach template",
    guide: "{pn} [reply/mention] or just {pn}"
  },
  onStart: async function ({ api, event, message, usersData }) {
    const cache = path.join(__dirname, "cache");
    const ts = Date.now();
    const outputPath = path.join(cache, `cockroach_out_${ts}.jpg`);
    const templatePath = path.join(cache, `cockroach_tpl_${ts}.jpg`);
    const avatarPath = path.join(cache, `cockroach_av_${ts}.jpg`);

    try {
      await fs.ensureDir(cache);

      let targetID = event.senderID;
      if (event.messageReply?.senderID) targetID = event.messageReply.senderID;
      if (event.mentions && Object.keys(event.mentions).length > 0) targetID = Object.keys(event.mentions)[0];

      let avatarURL = null;
      try { avatarURL = await usersData.getAvatarUrl(targetID); } catch {}
      if (!avatarURL) {
        try { const info = await api.getUserInfo(targetID); avatarURL = info?.[targetID]?.avatarUrl || null; } catch {}
      }
      if (!avatarURL) return message.reply("❌ প্রোফাইল পিক পাওয়া যায়নি!");

      let userName = "তুই";
      try { const info = await api.getUserInfo(targetID); userName = info?.[targetID]?.name || "তুই"; } catch {}

      const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`, { timeout: 15000 })).data;

      const [tplRes, avRes] = await Promise.all([
        axios.get(config.url, { responseType: "arraybuffer", timeout: 20000 }),
        axios.get(avatarURL, { responseType: "arraybuffer", timeout: 20000 })
      ]);
      await fs.writeFile(templatePath, tplRes.data);
      await fs.writeFile(avatarPath, avRes.data);

      const templateImg = await loadImage(templatePath);
      const avatarImg = await loadImage(avatarPath);
      const canvas = createCanvas(templateImg.width, templateImg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

      const pos = config.positions.face;
      const size = Math.min(avatarImg.width, avatarImg.height);
      const cropX = (avatarImg.width - size) / 2;
      const cropY = (avatarImg.height - size) / 2;
      ctx.save(); ctx.beginPath();
      ctx.ellipse(pos.x + pos.w / 2, pos.y + pos.h / 2, pos.w / 2, pos.h / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, cropX, cropY, size, size, pos.x, pos.y, pos.w, pos.h);
      ctx.restore();

      await fs.writeFile(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.95 }));

      const msgs = config.messages || ["🪳 Congratulations {name}! তুই officially আরশোলা"];
      const body = msgs[Math.floor(Math.random() * msgs.length)].replace("{name}", userName);
      await message.reply({ body, attachment: fs.createReadStream(outputPath) });
    } catch (err) {
      console.error("[cockroach] error:", err?.message || err);
      return message.reply("❌ Something went wrong generating that image. Please try again later.");
    } finally {
      setTimeout(async () => {
        try { await fs.remove(outputPath); await fs.remove(templatePath); await fs.remove(avatarPath); } catch {}
      }, 30000);
    }
  }
};
