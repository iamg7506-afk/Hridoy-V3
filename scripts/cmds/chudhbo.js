const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "chushbo";

module.exports = {
  config: {
    name: "chushbo",
    version: "1.3",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "chushbo tag fun",
    category: "Tag Fun",
    guide: {
      en: "{pn}chushbo @tag / reply / uid",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, mentions, messageReply } = event;

    // ── Target user ID বের করা (3 পদ্ধতি) ──
    let targetID;

    if (Object.keys(mentions).length > 0) {
      // ১. Mention/tag থেকে
      targetID = Object.keys(mentions)[0];
    } else if (messageReply) {
      // ২. Reply থেকে
      targetID = messageReply.senderID;
    } else if (args[0] && !isNaN(args[0])) {
      // ৩. Direct UID থেকে
      targetID = args[0];
    } else {
      return message.reply(
        `❌ কাউকে ট্যাগ করো, রিপ্লাই দাও, অথবা UID দাও!\nUsage: .${CMD_NAME} @user | .${CMD_NAME} (reply) | .${CMD_NAME} <uid>`
      );
    }

    try {
      // ── Step 1: API থেকে image config নেওয়া ──
      const configRes = await fetch(`${API_BASE}/api/images/${CMD_NAME}`);
      if (!configRes.ok) throw new Error(`API config পাওয়া যায়নি (${configRes.status})`);
      const config = await configRes.json();

      const bgURL    = config.url;
      const pos      = config.positions;
      const messages = config.messages || [];

      // ── Step 2: Profile picture URLs ──
      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const senderAvatarURL = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=${token}`;
      const targetAvatarURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${token}`;

      // ── Step 3: সব image load ──
      const [bgImage, senderAvatar, targetAvatar] = await Promise.all([
        loadImage(bgURL),
        loadImage(senderAvatarURL),
        loadImage(targetAvatarURL),
      ]);

      // ── Step 4: Canvas তৈরি ──
      const canvas = createCanvas(bgImage.width, bgImage.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height);

      // ── Step 5: Avatar আঁকা ──
      drawCircleAvatar(
        ctx, targetAvatar,
        pos.target.x + pos.target.w / 2,
        pos.target.y + pos.target.h / 2,
        pos.target.w / 2
      );
      drawCircleAvatar(
        ctx, senderAvatar,
        pos.sender.x + pos.sender.w / 2,
        pos.sender.y + pos.sender.h / 2,
        pos.sender.w / 2
      );

      // ── Step 6: Image save ──
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const outputPath = path.join(cacheDir, `chushbo_${Date.now()}.png`);
      fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
      setTimeout(() => { try { fs.unlinkSync(outputPath); } catch (_) {} }, 30000);

      // ── Step 7: নাম বের করা ──
      const senderInfo = await new Promise((resolve) =>
        api.getUserInfo(senderID, (err, data) => resolve(err ? {} : data))
      );
      const senderName = senderInfo[senderID]?.name || "Someone";

      // Target নামের জন্য — mention, reply, বা UID হতে পারে
      let targetName = "User";
      if (Object.keys(mentions).length > 0) {
        targetName = Object.values(mentions)[0];
      } else if (messageReply) {
        // Reply এর ক্ষেত্রে API থেকে নাম নেওয়া
        const targetInfo = await new Promise((resolve) =>
          api.getUserInfo(targetID, (err, data) => resolve(err ? {} : data))
        );
        targetName = targetInfo[targetID]?.name || "User";
      }
      // UID এর ক্ষেত্রেও নাম fetch করা
      if (args[0] && !isNaN(args[0]) && !messageReply && Object.keys(mentions).length === 0) {
        const targetInfo = await new Promise((resolve) =>
          api.getUserInfo(targetID, (err, data) => resolve(err ? {} : data))
        );
        targetName = targetInfo[targetID]?.name || targetID;
      }

      // ── Step 8: Message ──
      let body = `😈 ${senderName} chushbo করলো ${targetName} কে!`;
      if (messages.length > 0) {
        const raw = messages[Math.floor(Math.random() * messages.length)];
        body = raw
          .replace(/\{sender\}/g, senderName)
          .replace(/\{target\}/g, targetName);
      }

      return message.reply({
        body,
        attachment: fs.createReadStream(outputPath),
      });

    } catch (err) {
      console.error("Chushbo error:", err);
      return message.reply("❌ Error হয়েছে, আবার চেষ্টা করো।\n" + err.message);
    }
  },
};

function drawCircleAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}