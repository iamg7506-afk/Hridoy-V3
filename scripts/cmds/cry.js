const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegStatic);

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "cry",
    aliases: ["crying", "sob"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 15,
    role: 0,
    shortDescription: "Cry fun command 😢",
    category: "Tag Fun",
    guide: { en: "{pn}cry @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, mentions } = event;

    let targetID;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("❌ Usage:\n• .cry @user\n• .cry (reply)\n• .cry <uid>");
    }

    const tmpID = `${senderID}_${Date.now()}`;

    try {
      message.reply("😢 Processing...");

      // Fetch video url + overlay box + captions from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/cry`);

      const cacheDir = path.resolve("/tmp/cry_cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const videoPath  = path.resolve(cacheDir, `src_${tmpID}.mp4`);
      const avatarPath = path.resolve(cacheDir, `avatar_${tmpID}.png`);
      const outPath    = path.resolve(cacheDir, `out_${tmpID}.mp4`);

      const vidRes = await axios.get(cfg.url, { responseType: "arraybuffer", timeout: 60000 });
      fs.writeFileSync(videoPath, Buffer.from(vidRes.data));

      const { x: overlayX, y: overlayY, w: avatarW, h: avatarH } = cfg.overlay;

      const avatar = await loadImage(targetURL);
      const avatarCanvas = createCanvas(avatarW, avatarH);
      const ctx = avatarCanvas.getContext("2d");
      ctx.drawImage(avatar, 0, 0, avatarW, avatarH);
      fs.writeFileSync(avatarPath, avatarCanvas.toBuffer("image/png"));

      if (!fs.existsSync(videoPath)) throw new Error("Source video not found");
      if (!fs.existsSync(avatarPath)) throw new Error("Avatar image not found");

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(avatarPath)
          .complexFilter([
            `[1:v]scale=${avatarW}:${avatarH}[avatar]`,
            `[0:v][avatar]overlay=${overlayX}:${overlayY}[out]`
          ])
          .outputOptions([
            "-map [out]", "-map 0:a",
            "-c:v libx264", "-c:a aac", "-b:a 128k",
            "-preset fast", "-pix_fmt yuv420p", "-movflags +faststart", "-y"
          ])
          .output(outPath)
          .on("end", resolve)
          .on("error", (err, stdout, stderr) => {
            console.error("FFmpeg error:", err.message, stderr);
            reject(err);
          })
          .run();
      });

      if (!fs.existsSync(outPath)) return message.reply("❌ Output video not created!");

      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : [""];
      const caption = msgs[Math.floor(Math.random() * msgs.length)];

      await message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

      setTimeout(() => {
        [videoPath, avatarPath, outPath].forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
      }, 30000);

    } catch (err) {
      console.error("Cry error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
