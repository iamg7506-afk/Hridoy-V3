const money = require("../../utils/money");
const fs = require("fs");
const request = require("request");
const path = require("path");

const pathFile = path.join(__dirname, "../../cache/");
const GIF_URL = "https://i.imgur.com/cnoG4td.gif";
const GIF_PATH = path.join(pathFile, "dice.gif");

module.exports = {
    config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
        name: "dice",
        aliases: ["roll"],
        version: "2.2",
        author: "HR ID OY",
        role: 0,
        countDown: 5,
        category: "Game",
        description: "Dice gambling game (big / small)"
    },

    onLoad: function () {
        if (!fs.existsSync(pathFile)) {
            fs.mkdirSync(pathFile, { recursive: true });
        }

        if (!fs.existsSync(GIF_PATH)) {
            console.log("[Dice] Downloading dice GIF...");
            request(GIF_URL)
                .pipe(fs.createWriteStream(GIF_PATH))
                .on("close", () => console.log("[Dice] GIF downloaded successfully"))
                .on("error", (err) => console.error("[Dice] GIF download failed:", err));
        }
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, senderID } = event;

        if (!args[0] || !["big", "small"].includes(args[0].toLowerCase())) {
            return api.sendMessage(
                "⚠️ Usage: .dice big/small amount\nExample: .dice big 500",
                threadID
            );
        }

        const choice = args[0].toLowerCase();

        if (!args[1] || isNaN(args[1]) || args[1] <= 0) {
            return api.sendMessage(
                "⚠️ Bet amount দাও (number)!\nExample: .dice small 500",
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

        if (bet < 50) {
            return api.sendMessage(
                "⚠️ Minimum bet 50 coin!",
                threadID
            );
        }

        const oldBalance = userMoney;

        if (!fs.existsSync(GIF_PATH)) {
            return api.sendMessage(
                "❌ GIF এখনো download হয়নি। পরে আবার চেষ্টা করো।",
                threadID
            );
        }

        api.sendMessage({
            body: "🎲 Rolling the dice...",
            attachment: fs.createReadStream(GIF_PATH)
        }, threadID, async (err, info) => {

            if (err) return console.log(err);

            await new Promise(resolve => setTimeout(resolve, 3000));

            try { await api.unsendMessage(info.messageID); } catch {}

            // Dice number generate (1–6 × 3 dice system feel)
            const total = Math.floor(Math.random() * 14) + 4; // 4–17

            const resultType = total >= 11 ? "big" : "small";
            const win = choice === resultType;

            let replyText = "";

            if (win) {
                const winMoney = bet * 2;
                const tax = Math.floor(winMoney * 0.05);
                const finalProfit = winMoney - tax;

                await money.add(senderID, finalProfit);
                const newBalance = await money.get(senderID);

                replyText =
`╔══════════════╗
        🎲 DICE GAME 🎲
╚══════════════╝

🎯 Dice Total: ${total}
🎲 Result Type: ${resultType.toUpperCase()}

🎉 𝐕𝐈𝐂𝐓𝐎𝐑𝐘!
━━━━━━━━━━━━━━━━━━
💰 Bet Amount  : ${bet}
🏆 Win Amount  : ${winMoney}
💸 Tax (5%)    : -${tax}
💎 Final Profit: +${finalProfit}
💵 Old Balance : ${oldBalance}
💰 New Balance : ${newBalance}
━━━━━━━━━━━━━━━━━━
🔥 Dice loves you today!`;

            } else {

                await money.subtract(senderID, bet);
                const newBalance = await money.get(senderID);

                replyText =
`╔══════════════╗
        🎲 DICE GAME 🎲
╚══════════════╝

🎯 Dice Total: ${total}
🎲 Result Type: ${resultType.toUpperCase()}

💀 𝐃𝐄𝐅𝐄𝐀𝐓!
━━━━━━━━━━━━━━━━━━
💰 Bet Amount  : ${bet}
💸 Loss         : -${bet}
💵 Old Balance : ${oldBalance}
💎 New Balance : ${newBalance}
━━━━━━━━━━━━━━━━━━
😢 Try again and win big!`;
            }

            api.sendMessage(replyText, threadID);
        });
    }
};