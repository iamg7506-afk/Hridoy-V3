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
    name: "somoy",
    aliases: ["someynews", "news3"],
    version: "2.0",
    author: "HR ID OY",
    countDown: 15,
    role: 0,
    shortDescription: "Somoy TV news fun command 📺",
    category: "Tag Fun",
    guide: { en: "{pn}somoy @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID, mentions } = event;

    let targetID;
    if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("❌ Usage:\n• .somoy @user\n• .somoy (reply)\n• .somoy <uid>");
    }

    const tmpID = `${senderID}_${Date.now()}`;
    const cacheDir = path.resolve("/tmp/somoy_cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const videoPath = path.join(cacheDir, `src_${tmpID}.mp4`);
    const ppPath = path.join(cacheDir, `pp_${tmpID}.png`);
    const outPath = path.join(cacheDir, `out_${tmpID}.mp4`);
    const cleanup = () => [videoPath, ppPath, outPath].forEach((f) => { try { fs.unlinkSync(f); } catch (_) {} });

    try {
      // Video url + overlay box + fit mode + captions all come from the API
      const { data: cfg } = await axios.get(`${BASE}/api/images/somoy`);
      const BOX = cfg.positions.target;
      const size = cfg.avatarSize || 512;

      if (cfg.processingText) message.reply(cfg.processingText);

      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=${size}&height=${size}&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      // 1) Download template video
      const vidRes = await axios.get(cfg.url, { responseType: "arraybuffer", timeout: 60000 });
      fs.writeFileSync(videoPath, Buffer.from(vidRes.data));

      // 2) Canvas: target pic -> exact box size
      const avatar = await loadImage(targetURL);
      const canvas = createCanvas(BOX.w, BOX.h);
      const ctx = canvas.getContext("2d");

      if (BOX.fit === "cover") {
        const scale = Math.max(BOX.w / avatar.width, BOX.h / avatar.height);
        const dw = avatar.width * scale;
        const dh = avatar.height * scale;
        ctx.drawImage(avatar, (BOX.w - dw) / 2, (BOX.h - dh) / 2, dw, dh);
      } else {
        ctx.drawImage(avatar, 0, 0, BOX.w, BOX.h);
      }

      // optional soft shade (gradient stops come from the API)
      if (Array.isArray(cfg.shade) && cfg.shade.length) {
        const vg = ctx.createLinearGradient(0, 0, 0, BOX.h);
        cfg.shade.forEach(([stop, color]) => vg.addColorStop(stop, color));
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, BOX.w, BOX.h);
      }

      fs.writeFileSync(ppPath, canvas.toBuffer("image/png"));

      // 3) FFmpeg overlay on the box
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(ppPath)
          .complexFilter([
            `[1:v]scale=${BOX.w}:${BOX.h}[pp]`,
            `[0:v][pp]overlay=${BOX.x}:${BOX.y}[out]`,
          ])
          .outputOptions([
            "-map [out]", "-map 0:a?",
            "-c:v libx264", "-c:a aac", "-b:a 128k",
            "-preset fast", "-pix_fmt yuv420p",
            "-movflags +faststart", "-y",
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

      const msgs = cfg.messages || [];
      let body = msgs.length ? msgs[Math.floor(Math.random() * msgs.length)] : "";
      if (body) {
        const name = Object.values(mentions || {})[0] || "";
        body = body.split("{target}").join(name);
      }

      await message.reply({ body, attachment: fs.createReadStream(outPath) });
      setTimeout(cleanup, 30000);
    } catch (err) {
      console.error("somoy error:", err);
      cleanup();
      return message.reply("❌ Error: " + err.message);
    }
  },
};
