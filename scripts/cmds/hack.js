const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "hook",
    aliases: ["hck"],
    version: "3.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Hack hacking image 💻",
    category: "Tag Fun",
    guide: { en: "{pn}hack @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;

    let targetID;
    if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args.length > 0 && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      targetID = senderID;
    }

    try {
      const [userInfoRes, cfgRes] = await Promise.all([
        api.getUserInfo(targetID),
        axios.get(`${BASE}/api/images/hack`),
      ]);

      const name = userInfoRes[targetID]?.name || "User";
      const cfg = cfgRes.data;

      api.setMessageReaction("⏳", messageID, () => {}, true);

      const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [avatarBuf, templateBuf] = await Promise.all([
        axios.get(avatarUrl, { responseType: "arraybuffer" }),
        axios.get(cfg.url, { responseType: "arraybuffer" }),
      ]);

      const avatarImg   = await loadImage(avatarBuf.data);
      const templateImg = await loadImage(templateBuf.data);

      const canvas = createCanvas(templateImg.width, templateImg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

      const pos = cfg.positions.target;
      const cx = pos.cx;
      const cy = pos.cy;
      const r  = pos.r;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const filePath = path.join(cacheDir, `hook_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      const statusMsg = await api.sendMessage("💻 Initializing hack...", threadID);

      const steps = cfg.hackSteps || [
        "> ACCESSING DATABASE...",
        "> DECRYPTING FILES...",
        "> BYPASSING FIREWALL...",
        "> SYSTEM BREACHED",
      ];

      for (const step of steps) {
        await new Promise(r => setTimeout(r, 1500));
        await api.editMessage(`💻 Hacking in progress...\n\n${step}`, statusMsg.messageID);
      }

      await new Promise(r => setTimeout(r, 1000));
      await api.editMessage("✅ Hook complete! Sending proof...", statusMsg.messageID);

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msgs = cfg.messages || ["💻 {target} has been hacked!"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)]
        .replace("{target}", name);

      return api.sendMessage(
        { body: caption, attachment: fs.createReadStream(filePath) },
        threadID,
        () => { try { fs.unlinkSync(filePath); } catch (_) {} },
        messageID
      );

    } catch (err) {
      console.error("hook error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
