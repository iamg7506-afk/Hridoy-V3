const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "couple",
    version: "1.0.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Crush couple banner",
    longDescription: "Generate crush banner using UID",
    category: "Love",
    guide: "{pn} @mention / reply"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    let targetID;

    // mention check
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } 
    // reply check
    else if (messageReply) {
      targetID = messageReply.senderID;
    }

    if (!targetID) {
      return api.sendMessage(
        "Please reply or mention someone...",
        threadID,
        messageID
      );
    }

    const CAPTIONS = [
      `💛🌻
তোমার নামটা শুনলেই
মনটা কেমন জানি হালকা হয়ে যায় 🙂
এই অনুভূতিটাই হয়তো Crush 🫶`,

      `🫶💛
চুপচাপ তাকিয়ে থাকি,
কারণ চোখের ভাষায়
সব বলা যায় না 🌼
Crush 💛`,

      `🌻💛
ভালোবাসা না হয় পরে,
এই ভালো লাগাটুকু
এখনই খুব দামী 🫶`,

      `💛🙂
তুমি জানো না,
কিন্তু তোমার একটা হাসিই
কারো পুরো দিন ভালো করে দেয় 🌸`,

      `🫶🌼
তোমাকে পাওয়ার দাবি নেই,
শুধু মনে মনে
একটু ভালোবাসি 💛`,

      `🌼💛
এই অনুভূতিটার কোনো নাম হয় না,
তবুও সবাই একে
Crush বলেই চেনে 🫶`,

      `💛🌸
একটা মানুষ,
একটা অনুভূতি,
আর অজান্তেই
ভালো লেগে যাওয়া 🙂`
    ];

    try {
      // API list fetch
      const apiList = await axios.get(
        "https://raw.githubusercontent.com/shahadat-sahu/SAHU-API/refs/heads/main/SAHU-API.json"
      );

      const API = apiList.data.AvatarCanvas;

      // image generate
      const res = await axios.post(
        `${API}/api`,
        {
          cmd: "crush2",
          senderID,
          targetID
        },
        { responseType: "arraybuffer", timeout: 30000 }
      );

      // file save
      const filePath = path.join(
        __dirname,
        "tmp",
        `couple_${senderID}_${targetID}.png`
      );

      fs.writeFileSync(filePath, res.data);

      const randomCaption =
        CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];

      // send message
      await api.sendMessage(
        {
          body: randomCaption,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => fs.unlinkSync(filePath),
        messageID
      );

    } catch (err) {
      console.log(err);
      api.sendMessage(
        "API Error ❌",
        threadID,
        messageID
      );
    }
  }
};