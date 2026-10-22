const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegStatic);

const BASE = "https://hridoy-api.vercel.app";

// Avatar fetch with fallbacks (FB_TOKEN optional)
async function getAvatar(uid, api, size = 720) {
  const tries = [];
  if (process.env.FB_TOKEN) {
    tries.push(async () => `https://graph.facebook.com/${uid}/picture?width=${size}&height=${size}&access_token=${process.env.FB_TOKEN}`);
  }
  tries.push(async () => {
    const info = await api.getUserInfo(uid);
    const thumb = info && info[uid] && info[uid].thumbSrc;
    if (!thumb) throw new Error("no thumbSrc");
    return thumb;
  });
  tries.push(async () => `https://graph.facebook.com/${uid}/picture?width=${size}&height=${size}`);

  for (const t of tries) {
    try {
      const url = await t();
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
      return await loadImage(Buffer.from(r.data));
    } catch (_) {}
  }
  throw new Error("Avatar fetch failed");
}


module.exports = {
  config: {
    name: "biciless",
    aliases: ["tentical"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 15,
    role: 0,
    shortDescription: "Buri fun video command 🚲",
    category: "Tag Fun",
    guide: { en: "{pn} biciless @tag" },
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
      return message.reply("❌ Usage:\n• . biciless @user\n• . biciless (reply)\n• . biciless <uid>");
    }

    const tmpID = `${senderID}_${Date.now()}`;

    try {
      message.reply("");

      const { data: cfg } = await axios.get(`${BASE}/api/images/biciless`);

      const cacheDir = path.resolve("/tmp/buri_cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const videoURL  = cfg.url;

      const videoPath  = path.resolve(cacheDir, `src_${tmpID}.mp4`);
      const avatarPath = path.resolve(cacheDir, `avatar_${tmpID}.png`);
      const outPath    = path.resolve(cacheDir, `out_${tmpID}.mp4`);

      const vidRes = await axios.get(videoURL, { responseType: "arraybuffer", timeout: 60000 });
      fs.writeFileSync(videoPath, Buffer.from(vidRes.data));

      const ov = cfg.overlayConfig;
      const squareSize = ov.squareSize;
      const overlayX   = ov.overlayX;
      const overlayY   = ov.overlayY;

      const avatar = await getAvatar(targetID, api, 720);
      const avatarCanvas = createCanvas(squareSize, squareSize);
      const ctx = avatarCanvas.getContext("2d");
      ctx.drawImage(avatar, 0, 0, squareSize, squareSize);
      fs.writeFileSync(avatarPath, avatarCanvas.toBuffer("image/png"));

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(avatarPath)
          .complexFilter([
            `[1:v]scale=${squareSize}:${squareSize}[avatar]`,
            `[0:v][avatar]overlay=${overlayX}:${overlayY}[out]`,
          ])
          .outputOptions([
            "-map [out]", "-map 0:a",
            "-c:v libx264", "-c:a aac", "-b:a 128k",
            "-preset fast", "-pix_fmt yuv420p",
            "-movflags +faststart", "-y",
          ])
          .output(outPath)
          .on("end", resolve)
          .on("error", (err, _, stderr) => {
            console.error("FFmpeg error:", err.message, stderr);
            reject(err);
          })
          .run();
      });

      if (!fs.existsSync(outPath)) return message.reply("❌ Output video not created!");

      const msgs = cfg.messages || ["🚲"];
      const caption = msgs[Math.floor(Math.random() * msgs.length)];

      await message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

      setTimeout(() => {
        [videoPath, avatarPath, outPath].forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
      }, 30000);

    } catch (err) {
      console.error("biciless error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
