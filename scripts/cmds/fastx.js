const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: { name: "fastx", author: "HR ID OY", version: "2.2", cooldowns: 5, role: 0, shortDescription: "Generate AI images", category: "AI", guide: "{p}fastx <prompt> [--ar <ratio>]" },

  onStart: async function ({ message, args, api, event }) {
    const waitingMessage = await message.reply("Fastx is generating your images...");
    const runID = `${event.senderID}_${Date.now()}`;

    try {
      let prompt = "", ratio = "1:1";
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "--ar" && args[i + 1]) { ratio = args[i + 1]; i++; }
        else { prompt += args[i] + " "; }
      }
      prompt = prompt.trim();
      if (!prompt) { api.unsendMessage(waitingMessage.messageID); return message.reply("⚠️ Please provide a prompt."); }

      const config = (await axios.get(`${API_BASE}/api/links/fastx`, { timeout: 15000 })).data;
      if (!config?.url) throw new Error("fastx config missing 'url'");

      const cacheDir = path.join(__dirname, "tmp");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      // BUG: original filenames were fixed ("fastx_1.jpg" etc), shared across
      // ALL users and ALL concurrent runs — two people generating at the same
      // time would overwrite each other's files mid-write, and the finished
      // grid could show a mix of both prompts' images. Namespaced by runID now.
      //
      // BUG: Promise.all() meant if even ONE of the 4 upstream requests
      // failed (timeout, rate limit, transient error), the ENTIRE batch threw
      // and the user got a bare "Failed to generate image" with zero
      // indication that 3 of 4 actually succeeded. Using allSettled and
      // proceeding with whatever succeeded (min 1 needed) fixes this.
      const attempts = await Promise.allSettled(
        Array(4).fill(null).map(async (_, index) => {
          const { data } = await axios.get(config.url, {
            params: { [config.queryParam]: prompt, [config.ratioParam]: ratio },
            timeout: 30000
          });
          const imageUrl = data[config.responseKey];
          if (!imageUrl) throw new Error(`No ${config.responseKey} in response`);
          const imagePath = path.join(cacheDir, `fastx_${runID}_${index + 1}.jpg`);
          const writer = fs.createWriteStream(imagePath);
          const imageStream = await axios({ url: imageUrl, method: "GET", responseType: "stream", timeout: 30000 });
          imageStream.data.pipe(writer);
          await new Promise((r, j) => { writer.on("finish", r); writer.on("error", j); });
          return imagePath;
        })
      );

      const images = attempts.filter(a => a.status === "fulfilled").map(a => a.value);
      attempts.filter(a => a.status === "rejected").forEach(a => console.error("[fastx] one image failed:", a.reason?.message || a.reason));

      if (!images.length) throw new Error("All 4 image generations failed");

      const loadedImages = await Promise.all(images.map(img => loadImage(img)));
      const w = loadedImages[0].width, h = loadedImages[0].height;
      const canvas = createCanvas(w * 2, h * 2);
      const ctx = canvas.getContext("2d");
      const slots = [[0, 0], [w, 0], [0, h], [w, h]];
      loadedImages.forEach((img, i) => ctx.drawImage(img, slots[i][0], slots[i][1], w, h));

      const combinedPath = path.join(cacheDir, `fastx_${runID}_combined.jpg`);
      fs.writeFileSync(combinedPath, canvas.toBuffer("image/jpeg"));
      api.unsendMessage(waitingMessage.messageID);

      const label = images.length < 4 ? `❏ ${images.map((_, i) => `U${i + 1}`).join(", ")} (${4 - images.length} failed)` : "❏ U1, U2, U3, U4";
      const reply = await message.reply({ body: label, attachment: fs.createReadStream(combinedPath) });
      global.GoatBot.onReply.set(reply.messageID, { commandName: "fastx", messageID: reply.messageID, images, author: event.senderID });
    } catch (error) {
      console.error("[fastx] error:", error?.message || error);
      api.unsendMessage(waitingMessage.messageID);
      message.reply("❌ | Failed to generate image — the upstream generator may be down or rate-limited. Please try again later.");
    }
  },

  onReply: async function ({ api, event, Reply, args, message }) {
    const reply = args[0]?.toLowerCase();
    const { author, images } = Reply;
    if (event.senderID !== author) return;
    const validIndexes = ["u1", "u2", "u3", "u4"];
    if (!validIndexes.includes(reply)) return message.reply("❌ | Invalid. Use U1, U2, U3, or U4.");
    const index = parseInt(reply.slice(1)) - 1;
    if (!images[index]) return message.reply(`❌ | Image ${reply.toUpperCase()} wasn't generated successfully — pick one of the ${images.length} that were.`);
    return message.reply({ attachment: fs.createReadStream(images[index]) });
  }
};
