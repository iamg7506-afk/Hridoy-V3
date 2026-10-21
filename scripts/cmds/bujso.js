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
    name: "bujso",
    aliases: ["bujsosona"],
    version: "4.0",
    author: "HR ID OY",
    countDown: 15,
    role: 0,
    shortDescription: "Bujso Sona fun command 😂",
    category: "Tag Fun",
    guide: { en: "{pn}bujso @tag" },
  },

  onStart: async function ({ api, event, args, message }) {
    const { mentions } = event;

    let targetID;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("❌ Usage:\n• .bujso @user\n• .bujso (reply)\n• .bujso <uid>");
    }

    try {
      const { data: cfg } = await axios.get(`${BASE}/api/images/bujso`);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const targetURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const videoPath = path.join(cacheDir, `bujso_src_${Date.now()}.mp4`);
      const vidRes = await axios.get(cfg.url, { responseType: "arraybuffer", timeout: 30000 });
      fs.writeFileSync(videoPath, Buffer.from(vidRes.data));

      const { x: overlayX, y: overlayY, w: boxW, h: boxH } = cfg.overlay;

      const avatar = await loadImage(targetURL);
      const ppCanvas = createCanvas(boxW, boxH);
      const ppCtx = ppCanvas.getContext("2d");
      ppCtx.drawImage(avatar, 0, 0, boxW, boxH);
      const ppPath = path.join(cacheDir, `pp_${Date.now()}.png`);
      fs.writeFileSync(ppPath, ppCanvas.toBuffer("image/png"));

      const outPath = path.join(cacheDir, `bujso_out_${Date.now()}.mp4`);

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(ppPath)
          .complexFilter(`[1:v]scale=${boxW}:${boxH}[pp];[0:v][pp]overlay=${overlayX}:${overlayY}`)
          .outputOptions(["-c:a copy", "-preset fast", "-movflags +faststart"])
          .output(outPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      try { fs.unlinkSync(videoPath); fs.unlinkSync(ppPath); } catch (_) {}

      if (!fs.existsSync(outPath)) return message.reply("❌ Video processing failed!");

      const msgs = cfg.messages && cfg.messages.length ? cfg.messages : [""];
      const caption = msgs[Math.floor(Math.random() * msgs.length)];

      await message.reply({
        body: caption,
        attachment: fs.createReadStream(outPath),
      });

      setTimeout(() => { try { fs.unlinkSync(outPath); } catch (_) {} }, 30000);

    } catch (err) {
      console.error("Bujso error:", err);
      return message.reply("❌ Error: " + err.message);
    }
  },
};
