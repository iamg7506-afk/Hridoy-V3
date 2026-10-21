const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "weigen", aliases: ["wgen"], version: "2.3", author: "HR ID OY",
    countDown: 3, role: 0, shortDescription: "Generate AI image", category: "AI", guide: "{pn} <prompt>"
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("⚠️ | Please enter a prompt.", event.threadID, event.messageID);

    const msg = await api.sendMessage("🖌️ | Generating image, please wait...", event.threadID);
    let imgPath;

    try {
      const cfg = (await axios.get(`${API_BASE}/api/links/wgen`, { timeout: 15000 })).data;
      if (!cfg?.url) throw new Error("wgen config missing 'url' from API server");

      // BUG: this always sent the param as "prompt" no matter what the
      // gateway config actually specifies for this API — if the upstream
      // image generator expects e.g. "q" or "text", every single request
      // 400'd. Read the param name from config with "prompt" only as fallback.
      const paramName = cfg.queryParam || "prompt";

      // BUG: cache dir was "../cache" (one level ABOVE the commands folder),
      // which may not exist or may not be writable depending on deployment —
      // that alone can make every generation fail at the writer.on("error") step.
      const cachePath = path.join(__dirname, "cache");
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });
      imgPath = path.join(cachePath, `weigen-${Date.now()}.png`);

      const response = await axios({
        method: "GET",
        url: cfg.url,
        params: { [paramName]: prompt },
        responseType: "stream",
        timeout: 60000
      });

      const writer = fs.createWriteStream(imgPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
        response.data.on("error", reject);
      });

      await api.sendMessage({
        body: `🎨 | Image generated for:\n"${prompt}"`,
        attachment: fs.createReadStream(imgPath)
      }, event.threadID, () => fs.unlink(imgPath, () => {}), msg.messageID);
    } catch (err) {
      console.error("[wgen] error:", err?.message || err);
      if (imgPath && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      return api.sendMessage("❌ | Failed to generate image — the image generator may be down. Please try again later.", event.threadID, msg.messageID);
    }
  }
};
