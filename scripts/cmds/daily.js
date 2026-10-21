const money = require("../../utils/money");
const fs = require("fs");
const request = require("request");
const path = require("path");

const pathFile = path.join(__dirname, "../../cache/");
const DATA_PATH = path.join(pathFile, "dailyData.json");
const GIF_URL = "https://i.imgur.com/tKyLh5l.gif";
const GIF_PATH = path.join(pathFile, "daily.gif");

module.exports = {
    config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
        name: "daily",
        aliases: ["reward"],
        version: "1.1",
        author: "HR ID OY",
        role: 0,
        countDown: 5,
        category: "Game",
        description: "Daily reward (1000 - 10000 coins, 24h cooldown)"
    },

    onLoad: function () {
        if (!fs.existsSync(pathFile)) {
            fs.mkdirSync(pathFile, { recursive: true });
        }

        if (!fs.existsSync(DATA_PATH)) {
            fs.writeFileSync(DATA_PATH, JSON.stringify({}));
        }

        if (!fs.existsSync(GIF_PATH)) {
            console.log("[Daily] Downloading daily GIF...");
            request(GIF_URL)
                .pipe(fs.createWriteStream(GIF_PATH))
                .on("close", () => console.log("[Daily] GIF downloaded successfully"))
                .on("error", (err) => console.error("[Daily] GIF download failed:", err));
        }
    },

    onStart: async function ({ api, event }) {
        const { threadID, senderID } = event;

        const dailyData = JSON.parse(fs.readFileSync(DATA_PATH));
        const now = Date.now();

        if (dailyData[senderID] && now - dailyData[senderID] < 86400000) {
            const timeLeft = 86400000 - (now - dailyData[senderID]);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            return api.sendMessage(
                `⏳ তুমি ইতিমধ্যে Daily নিয়েছো!\nআবার নিতে পারবে ${hours}h ${minutes}m পরে.`,
                threadID
            );
        }

        if (!fs.existsSync(GIF_PATH)) {
            return api.sendMessage("❌ GIF এখনো download হয়নি। পরে আবার চেষ্টা করো।", threadID);
        }

        api.sendMessage({
            body: "🎁 Opening your Daily Reward...",
            attachment: fs.createReadStream(GIF_PATH)
        }, threadID, async (err, info) => {

            if (err) return console.log(err);

            await new Promise(resolve => setTimeout(resolve, 3000));

            try { await api.unsendMessage(info.messageID); } catch {}

            const reward = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;

            // 🔧 ফিক্স: money.get() / money.add() async হলে অবশ্যই await লাগবে,
            // নাহলে Promise অবজেক্টটাই ভ্যারিয়েবলে বসে যায় ([object Promise])
            const oldBalance = await money.get(senderID);
            await money.add(senderID, reward);
            const newBalance = await money.get(senderID);

            dailyData[senderID] = now;
            fs.writeFileSync(DATA_PATH, JSON.stringify(dailyData, null, 2));

            const replyText =
`╔══════════════╗
 🎁 DAILY REWARD 🎁
╚══════════════╝

💰 Reward Received: ${reward}

━━━━━━━━━━━━━━━━━━
💵 Old Balance : ${oldBalance}
💎 New Balance : ${newBalance}
━━━━━━━━━━━━━━━━━━
🔥 Come back after 24 hours!`;

            api.sendMessage(replyText, threadID);
        });
    }
};