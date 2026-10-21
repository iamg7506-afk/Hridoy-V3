const fs = require("fs");
// Loaded lazily: the package runs code at require-time, and a failure/hang there must not stop the bot starting.
let _dl;
function downloadVideo(url) {
    if (!_dl) {
        const realExit = process.exit;
        process.exit = () => { throw new Error("sagor-video-downloader tried to exit the process"); };
        try { _dl = require("sagor-video-downloader").downloadVideo; }
        finally { process.exit = realExit; }
    }
    return _dl(url);
}

module.exports = {
    config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
        name: "autolink",
        version: "1.4",
        author: "HR ID OY",
        countDown: 5,
        role: 0,
        shortDescription: "Auto-download & send videos silently (no messages)",
        category: "Media",
    },

    onStart: async function () {},

    onChat: async function ({ api, event }) {
        const threadID = event.threadID;
        const messageID = event.messageID;
        const message = event.body || "";

        const linkMatches = message.match(/(https?:\/\/[^\s]+)/g);
        if (!linkMatches || linkMatches.length === 0) return;

        const uniqueLinks = [...new Set(linkMatches)];

        api.setMessageReaction("⏳", messageID, () => {}, true);

        let successCount = 0;
        let failCount = 0;

        for (const url of uniqueLinks) {
            try {
                const { title, filePath } = await downloadVideo(url);
                if (!filePath || !fs.existsSync(filePath)) throw new Error();

                const stats = fs.statSync(filePath);
                const fileSizeInMB = stats.size / (1024 * 1024);

                if (fileSizeInMB > 25) {
                    fs.unlinkSync(filePath);
                    failCount++;
                    continue;
                }

                await api.sendMessage(
                    {
                        body:
`📥 ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ...`,
                        attachment: fs.createReadStream(filePath)
                    },
                    threadID,
                    () => fs.unlinkSync(filePath)
                );

                successCount++;

            } catch {
                failCount++;
            }
        }

        const finalReaction =
            successCount > 0 && failCount === 0 ? "✅" :
            successCount > 0 ? "⚠️" : "❌";

        api.setMessageReaction(finalReaction, messageID, () => {}, true);
    }
};
