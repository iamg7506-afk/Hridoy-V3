const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";
module.exports = {
  config: { name: "country", aliases: ["cty"], version: "2.1", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Country info with photo", category: "AI", guide: { en: "{pn} <country name>\nExample: {pn} Bangladesh" } },
  onStart: async function ({ api, event, args }) {
    let flagPath = null, photoPath = null;
    try {
      const query = args.join(" ").trim();
      if (!query) return api.sendMessage("❌ | Please enter a country name.\n\n📌 Example: .country Bangladesh", event.threadID);
      const config = (await axios.get(`${API_BASE}/api/links/country`, { timeout: 10000 })).data;
      const res = await axios.get(config.url, {
        params: { q: query, limit: 1, pretty: 1 },
        headers: { Authorization: `${config.authPrefix}${config.apiKey}`, Accept: "application/json" },
        timeout: 20000, validateStatus: () => true
      });
      if (res.status < 200 || res.status >= 300) return api.sendMessage(`❌ | Country API Error: ${res.status}`, event.threadID);
      const objects = res.data?.data?.objects;
      if (!Array.isArray(objects) || !objects.length) return api.sendMessage(`❌ | Country "${query}" not found.`, event.threadID);
      const data = objects[0];
      const commonName = data.names?.common || data.names?.official || "N/A";
      const officialName = data.names?.official || commonName;
      const capital = Array.isArray(data.capital) ? data.capital.join(", ") : data.capital || "N/A";
      const population = data.population != null ? Number(data.population).toLocaleString() : "N/A";
      const area = data.area != null ? `${Number(data.area).toLocaleString()} km²` : "N/A";
      let currencies = "N/A";
      if (data.currencies) { const vals = Array.isArray(data.currencies) ? data.currencies : Object.values(data.currencies); currencies = vals.map(c => typeof c==="string"?c:`${c?.name||""}${c?.symbol?` (${c.symbol})`:""}`).join(", "); }
      let languages = "N/A";
      if (data.languages) { languages = Array.isArray(data.languages) ? data.languages.join(", ") : Object.values(data.languages).join(", "); }
      const timezones = Array.isArray(data.timezones) ? data.timezones.join(", ") : data.timezones || "N/A";
      const cacheDir = path.join(__dirname, "cache"); await fs.ensureDir(cacheDir);
      let flagUrl = typeof data.flag==="string" ? data.flag : data.flag?.png || data.flags?.png || data.flags?.svg || null;
      if (flagUrl) { try { flagPath = path.join(cacheDir, `flag_${Date.now()}.png`); const flag = await axios.get(flagUrl, { responseType: "arraybuffer", timeout: 15000 }); await fs.writeFile(flagPath, Buffer.from(flag.data)); } catch { flagPath = null; } }
      try {
        const wiki = await axios.get("https://commons.wikimedia.org/w/api.php", { params: { action:"query", generator:"search", gsrsearch:`${commonName} country landscape`, gsrnamespace:6, gsrlimit:1, prop:"imageinfo", iiprop:"url", format:"json", origin:"*" }, timeout: 15000 });
        const pages = wiki.data?.query?.pages;
        if (pages) { const imgUrl = Object.values(pages)[0]?.imageinfo?.[0]?.url; if (imgUrl) { photoPath = path.join(cacheDir, `photo_${Date.now()}.jpg`); const photo = await axios.get(imgUrl, { responseType:"arraybuffer", timeout:20000 }); await fs.writeFile(photoPath, Buffer.from(photo.data)); } }
      } catch {}
      const msg = `🌍 𝗖𝗢𝗨𝗡𝗧𝗥𝗬 𝗗𝗘𝗧𝗔𝗜𝗟𝗦\n\n📛 Official: ${officialName}\n🏷️ Common: ${commonName}\n🏳️ Capital: ${capital}\n🌐 Region: ${data.region||"N/A"}\n\n👥 Population: ${population}\n📏 Area: ${area}\n💰 Currency: ${currencies}\n🗣️ Languages: ${languages}\n⏰ Timezones: ${timezones}`;
      const attachment = photoPath ? fs.createReadStream(photoPath) : flagPath ? fs.createReadStream(flagPath) : null;
      if (attachment) await api.sendMessage({ body: msg, attachment }, event.threadID);
      else await api.sendMessage(msg, event.threadID);
      if (photoPath && flagPath) await api.sendMessage({ body: `🏳️ ${commonName} — National Flag`, attachment: fs.createReadStream(flagPath) }, event.threadID);
    } catch (err) {
      return api.sendMessage(`❌ | Failed to get country information.\n⚠️ Error: ${err.message}`, event.threadID);
    } finally {
      for (const f of [flagPath, photoPath]) { if (f) { try { await fs.remove(f); } catch {} } }
    }
  }
};
