const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports.config = {
    name: "blanime",
    version: "2.0.1",
    hasPermssion: 0,
    author: "HR ID OY",
    description: "Random anime profile picture",
    category: "Image",
    usages: "{pn}",
    cooldowns: 5
};

module.exports.onStart = async function({ api, event }) {
    try {
        const res = await axios.get(`${API_BASE}/api/links/bblur_images`);
        const items = res.data?.items;
        if (!Array.isArray(items) || !items.length) throw new Error("No images");

        const randomImage = items[Math.floor(Math.random() * items.length)];
        const stream = await global.utils.getStreamFromURL(randomImage);

        if (!stream) return api.sendMessage("❌ Failed to load image.", event.threadID, event.messageID);

        return api.sendMessage({
            body: "Anime profile for you\nTag: Anime Blur",
            attachment: stream
        }, event.threadID, event.messageID);

    } catch (err) {
        console.error(err);
        return api.sendMessage("❌ Failed to send image.", event.threadID, event.messageID);
    }
};
