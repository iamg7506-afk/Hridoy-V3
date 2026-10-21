const axios = require("axios");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "pickupline",
    version: "5.0.0",
    author: "HR ID OY",
    countDown: 3,
    role: 0,
    shortDescription: "Get 150+ Bangla/English pickuplines with emojis",
    longDescription: "Get random flirty lines with emojis.",
    category: "AI",
    guide: "{pn} bangla / {pn} english"
  },

  onStart: async function ({ api, event, args }) {
    const input = args[0]?.toLowerCase();

    if (input !== "bangla" && input !== "english") {
      return api.sendMessage("⚠️ Please use:\n/pickupline bangla\nOR\n/pickupline english", event.threadID, event.messageID);
    }

    try {
      const cfgName = input === "bangla" ? "pickupline_bn" : "pickupline_en";
      const { data: cfg } = await axios.get(`${BASE}/api/links/${cfgName}`);
      const lines = cfg.items || [];
      if (!lines.length) throw new Error("No lines configured.");

      const line = lines[Math.floor(Math.random() * lines.length)];
      const label = input === "bangla" ? "✨ [Bangla Pickupline] ✨" : "💖 [English Pickupline] 💖";

      return api.sendMessage(`${label}\n\n${line}`, event.threadID, event.messageID);

    } catch (err) {
      console.error("Pickupline error:", err);
      return api.sendMessage("❌ Could not fetch a pickup line right now.", event.threadID, event.messageID);
    }
  }
};
