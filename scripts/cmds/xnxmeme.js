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
    name: "xnxmeme",
    version: "3.0",
    author: "HR ID OY",
    countDown: 15,
    role: 0,
    shortDescription: "News anchor fun command 📺",
    category: "Tag Fun",
    guide: { en: "{pn}news @tag" },
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
      return message.reply("❌ Usage:\n• .news @user\n• .news (reply)\n• .news <uid>");
    }

    const tmpID = `${senderID}_${Date.now()}`;

    try {
      message.reply("📺 Processing...");

      const { data: cfg } = await axios.get(`${BASE}/api/images/xnxmeme`);

      const cacheDir = path.resolve("/tmp/news_cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const videoPath = path.resolve(cacheDir, `src_${tmpID}.mp4`);
      const leftPath  = path.resolve(cacheDir, `left_${tmpID}.png`);
      const rightPath = path.resolve(cacheDir, `right_${tmpID}.png`);
      const outPath   = path.resolve(cacheDir, `out_${tmpID}.mp4`);

      const vidRes = await axios.get(cfg.url, { responseType: "arraybuffer", timeout: 60000 });
      fs.writeFileSync(videoPath, Buffer.from(vidRes.data));

      const avatar = await loadImage(targetURL);

      const L = cfg.overlay_left, R = cfg.overlay_right;

      const leftCanvas = createCanvas(L.w, L.h);
      leftCanvas.getContext("2d").drawImage(avatar, 0, 0, L.w, L.h);
      fs.writeFileSync(leftPath, leftCanvas.toBuffer("image/png"));

      const rightCanvas = createCanvas(R.w, R.h);
      rightCanvas.getContext("2d").drawImage(avatar, 0, 0, R.w, R.h);
      fs.writeFileSync(rightPath, rightCanvas.toBuffer("image/png"));

      if (!fs.existsSync(videoPath)) throw new Error("Source video not found");
      if (!fs.existsSync(leftPath))  throw new Error("Left image not found");
      if (!fs.existsSync(rightPath)) throw new Error("Right image not found");

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(leftPath)
          .input(rightPath)
          .complexFilter([
            `[1:v]scale=${L.w}:${L.h}[left]`,
            `[2:v]scale=${R.w}:${R.h}[right]`,
            `[0:v][left]overlay=${L.x}:${L.y}[tmp]`,
            `[tmp][right]overlay=${R.x}:${R.y}[out]`
          ])
          .outputOptions([
            "-map [out]", "-map 0:a",
            "-c:v libx264", "-c:a aac", "-b:a 128k",
            "-preset fast", "-pix_fmt yuv420p", "-movflags +faststart", "-y"
          ])
          .output(outPath)
          .on("start", (cmd) => console.log("FFmpeg cmd:", cmd))
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
        [videoPath, leftPath, rightPath, outPath].forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
      }, 30000);

    } catch (err) {
      console.error("News error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
