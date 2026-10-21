const axios = require("axios");

const API_BASE = "https://hridoy-api.vercel.app";

module.exports = {
  config: {
    name: "usta",
    version: "11.1",
    author: "HR ID OY",
    countDown: 3,
    role: 0,
    shortDescription: "Usta mare 😈",
    category: "Tag Fun",
    guide: "{pn} (reply someone)"
  },

  onStart: async function ({ api, event }) {
    try {
      if (!event.messageReply)
        return api.sendMessage("⚠ Reply diya use kor!", event.threadID, event.messageID);

      const { senderID } = event;
      const targetID = event.messageReply.senderID;

      // Get API config from gateway
      const cfg = await axios.get(`${API_BASE}/api/links/usta`);
      const { url, body } = cfg.data;

      const res = await axios.get(`${url}?senderID=${senderID}&targetID=${targetID}`, {
        responseType: "stream"
      });

      return api.sendMessage({ body, attachment: res.data }, event.threadID, event.messageID);
    } catch (err) {
      return api.sendMessage("❌ Error hoise!", event.threadID, event.messageID);
    }
  }
};
