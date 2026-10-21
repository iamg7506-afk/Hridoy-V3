const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const usedIdsFile = path.join(__dirname, "tikporn_used_ids.json");

// Load used IDs from file (persistent across restarts)
let usedIds = new Set();
if (fs.existsSync(usedIdsFile)) {
  try {
    const data = fs.readFileSync(usedIdsFile, "utf8");
    usedIds = new Set(JSON.parse(data));
  } catch (e) {
    console.error("Used IDs load error:", e.message);
  }
}

function saveUsedIds() {
  try {
    fs.writeFileSync(usedIdsFile, JSON.stringify([...usedIds]), "utf8");
  } catch (e) {
    console.error("Save used IDs error:", e.message);
  }
}

module.exports = {
  config: {
    name: "fikfab",
    version: "1.4",
    author: "HR ID OY",
    role: 0,
    description: "Random Tik.Porn video – no repeats ever (persistent tracking)",
    category: "NSFW",
    guide: "fikfab",
    cooldown: 10
  },

  onStart: async function ({ api, event }) {
    const maxAttempts = 15;
    let attempts = 0;
    let videoUrl = null;
    let randomId = null;

    // Updated range – March 2026 (recent ~1388000–139xxxx, extend if needed)
    const min = 1000000;
    const max = 1400000;  // 1400000+ এখনো invalid, কিন্তু future-proof

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Generate unused ID
        do {
          randomId = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (usedIds.has(randomId));

        const videoPageUrl = `https://tik.porn/video/${randomId}`;

        const response = await axios.get(videoPageUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoatBot)' }
        });

        const html = response.data;

        // Extract video src
        let srcMatch = html.match(/<video[^>]*src=["'](.*?)["']/i);
        videoUrl = srcMatch ? srcMatch[1] : null;

        if (!videoUrl) {
          const sourceMatch = html.match(/<source[^>]*src=["'](.*?)["']/i);
          videoUrl = sourceMatch ? sourceMatch[1] : null;
        }

        if (!videoUrl || videoUrl.trim() === "") {
          // Invalid → skip, DO NOT add to used
          console.log(`No valid src for ${randomId}, retrying...`);
          continue;
        }

        // Valid video পেলে এখনই add করো
        usedIds.add(randomId);
        saveUsedIds();  // Save immediately

        // Cache folder ensure + unique filename
        const cacheDir = path.join(__dirname, "cache");
        await fs.ensureDir(cacheDir);
        const filePath = path.join(cacheDir, `tikporn_\( {randomId}_ \){Date.now()}.mp4`);

        // Download
        const videoResponse = await axios.get(videoUrl, {
          responseType: "arraybuffer",
          timeout: 30000
        });

        fs.writeFileSync(filePath, Buffer.from(videoResponse.data));

        // Send
        api.sendMessage(
          {
            body: `Random Tik.Porn clip 🔥 (No repeat guaranteed!)\nID: ${randomId}\nAttempts: ${attempts}`,
            attachment: fs.createReadStream(filePath)
          },
          event.threadID,
          () => fs.unlinkSync(filePath),
          event.messageID
        );

        return; // Success

      } catch (error) {
        console.error(`Attempt ${attempts} - ID ${randomId || 'unknown'}: ${error.message}`);

        if (error.response?.status === 404) {
          // Invalid ID → skip, but DO NOT add
          continue;
        }

        // Timeout/network/other → stop loop to avoid ban/rate-limit
        api.sendMessage(
          "Network error বা timeout হয়েছে। কিছুক্ষণ পর আবার !fikfab দাও।",
          event.threadID,
          event.messageID
        );
        return;
      }
    }

    // Failed after max attempts
    api.sendMessage(
      `দুঃখিত! ${maxAttempts} বার চেষ্টা করেও নতুন valid video পাইনি।\nCurrent range: \( {min}– \){max}\nহয়তো range বাড়াতে হবে বা সাইট চেক করো।`,
      event.threadID,
      event.messageID
    );
  }
};