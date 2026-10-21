const axios = require("axios");

// Cooldown storage
const cooldowns = new Map();

module.exports = {
  config: {
    name: "hridoy",
    version: "1.4.2",
    author: "HR ID OY",
    role: 0,
    category: "Admin",
    shortDescription: "Auto profile reply with keyword + admin mention",
    countDown: 3
  },

  onStart: async function () {
    return;
  },

  onChat: async function ({ event, api }) {
    // ✅ Self message ignore (bot এর নিজের মেসেজে রিপ্লাই বন্ধ)
    if (event.senderID === api.getCurrentUserID()) return;

    const msg = (event.body || "").toLowerCase();

    // ✅ তোমার admin UID
    const adminUIDs = ["100067155687291", "61595715143202"];

    const isKeyword = msg.includes("hridoy");
    const isAdminMention =
      event.mentions &&
      Object.keys(event.mentions).some(id => adminUIDs.includes(id));

    if (!isKeyword && !isAdminMention) return;

    // ✅ Cooldown per thread (config.countDown সেকেন্ড অনুযায়ী)
    const threadID = event.threadID;
    const now = Date.now();
    const cooldownMs = (module.exports.config.countDown || 3) * 1000;

    if (
      cooldowns.has(threadID) &&
      now - cooldowns.get(threadID) < cooldownMs
    ) {
      return;
    }

    cooldowns.set(threadID, now);

    const imageUrl = "https://i.imgur.com/6dpggxq.jpeg";

    const body =
`✦━━━━━━〔 𝑷𝑹𝑶𝑭𝑰𝑳𝑬 〕━━━━━━✦
✨ NAME   ➤ HR ID OY
✨ AGE    ➤ 20+
✨ STATUS ➤ SINGLE
✨ LOC    ➤ JASHORE

✦━━━━━━━〔 𝑺𝑶𝑪𝑰𝑨𝑳〕━━━━━━━✦
🌐 FB   ➤ fb.me/DukkhoBilash8276
📧 MAIL ➤ hridoyhossen049@gmail.com
📱 WA   ➤ 01744-******

✦━━━━━━━━〔 𝑮𝑨𝑴𝑬〕━━━━━━━✦
🔫 FREE FIRE

✦━━━━━━━━━━━━━━━━━━━━✦
⚡ SYSTEM STATUS : ONLINE`;

    try {
      const img = await axios.get(imageUrl, {
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      return api.sendMessage(
        {
          body,
          attachment: img.data
        },
        threadID,
        event.messageID
      );

    } catch (err) {
      return api.sendMessage(
        body + "\n\n❌ Image load failed!",
        threadID,
        event.messageID
      );
    }
  }
};
