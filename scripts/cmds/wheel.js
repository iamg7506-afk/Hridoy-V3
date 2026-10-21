const money = require("../../utils/money");
const fs = require("fs");
const request = require("request");
const path = require("path");

const pathFile = path.join(__dirname, "../../cache/");
const GIF_URL = "https://i.imgur.com/MTZwLqo.gif";
const GIF_PATH = path.join(pathFile, "wheel.gif");

module.exports = {
    config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
        name: "wheel",
        aliases: ["spinwheel"],
        version: "1.2",
        author: "HR ID OY",
        role: 0,
        countDown: 5,
        category: "Game",
        description: "Spin Wheel Game (red / yellow / blue)"
    },

    onLoad: function () {
        if (!fs.existsSync(pathFile)) {
            fs.mkdirSync(pathFile, { recursive: true });
        }

        if (!fs.existsSync(GIF_PATH)) {
            console.log("[Wheel] Downloading wheel GIF...");
            request(GIF_URL)
                .pipe(fs.createWriteStream(GIF_PATH))
                .on("close", () => console.log("[Wheel] GIF downloaded successfully"))
                .on("error", (err) => console.error("[Wheel] GIF download failed:", err));
        }
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, senderID } = event;

        if (!args[0] || !["red", "yellow", "blue"].includes(args[0].toLowerCase())) {
            return api.sendMessage(
                "⚠️ Usage: .wheel red/yellow/blue amount\nExample: .wheel red 500",
                threadID
            );
        }

        const choice = args[0].toLowerCase();

        if (!args[1] || isNaN(args[1]) || args[1] <= 0) {
            return api.sendMessage(
                "⚠️ Bet amount দাও (number)!\nExample: .wheel blue 500",
                threadID
            );
        }

        const bet = parseInt(args[1]);
        const userMoney = await money.get(senderID);

        if (bet > userMoney) {
            return api.sendMessage(
                `❌ তোমার ব্যালেন্সে যথেষ্ট coin নেই!\nBalance: ${userMoney}`,
                threadID
            );
        }

        if (bet < 20) {
            return api.sendMessage("⚠️ Minimum bet 20 coin!", threadID);
        }

        const oldBalance = userMoney;

        if (!fs.existsSync(GIF_PATH)) {
            return api.sendMessage(
                "❌ GIF এখনো download হয়নি। পরে আবার চেষ্টা করো।",
                threadID
            );
        }

        api.sendMessage({
            body: "🎡 Spinning the wheel...",
            attachment: fs.createReadStream(GIF_PATH)
        }, threadID, async (err, info) => {

            if (err) return console.log(err);

            await new Promise(resolve => setTimeout(resolve, 3000));

            try { await api.unsendMessage(info.messageID); } catch {}

            const colors = ["red", "yellow", "blue"];
            const result = colors[Math.floor(Math.random() * colors.length)];

            const win = choice === result;

            let replyText = "";
            const formattedResult = result.toUpperCase();

            if (win) {
                await money.add(senderID, bet);
                const newBalance = await money.get(senderID);

                replyText =
`╔══════════════╗
        🎡 WHEEL SPIN 🎡
╚══════════════╝

🎯 Result Color: ${formattedResult}

🎉 𝐕𝐈𝐂𝐓𝐎𝐑𝐘!
━━━━━━━━━━━━━━━━━━
💰 Bet Amount  : ${bet}
🏆 Profit       : +${bet}
💵 Old Balance : ${oldBalance}
💎 New Balance : ${newBalance}
━━━━━━━━━━━━━━━━━━
🔥 The wheel favors you!`;

            } else {

                await money.subtract(senderID, bet);
                const newBalance = await money.get(senderID);

                replyText =
`╔══════════════╗
        🎡 WHEEL SPIN 🎡
╚══════════════╝

🎯 Result Color: ${formattedResult}

💀 𝐃𝐄𝐅𝐄𝐀𝐓!
━━━━━━━━━━━━━━━━━━
💰 Bet Amount  : ${bet}
💸 Loss         : -${bet}
💵 Old Balance : ${oldBalance}
💎 New Balance : ${newBalance}
━━━━━━━━━━━━━━━━━━
😢 Better luck next spin!`;
            }

            api.sendMessage(replyText, threadID);
        });
    }
};