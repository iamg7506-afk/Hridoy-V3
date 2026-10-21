const money = require("../../utils/money");
const fs = require("fs");
const request = require("request");
const path = require("path");

const pathFile = path.join(__dirname, "../../cache/");
const GIF_URL = "https://i.imgur.com/sBUJ1gN.gif";
const GIF_PATH = path.join(pathFile, "coinflip.gif");

module.exports = {
    config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
        name: "coinflip",
        aliases: ["cf", "flip"],
        version: "6.4",
        author: "HR ID OY",
        role: 0,
        countDown: 5,
        category: "Game",
        description: "Coinflip game with user choice (head/tail) → GIF → Result"
    },

    onLoad: function () {
        if (!fs.existsSync(pathFile)) {
            fs.mkdirSync(pathFile, { recursive: true });
        }

        if (!fs.existsSync(GIF_PATH)) {
            console.log("[Coinflip] Downloading coinflip GIF...");
            request(GIF_URL)
                .pipe(fs.createWriteStream(GIF_PATH))
                .on("close", () => console.log("[Coinflip] GIF downloaded successfully"))
                .on("error", (err) => console.error("[Coinflip] GIF download failed:", err));
        }
    },

    onStart: async function ({ message, event, args, api }) {
        const { threadID, senderID } = event;

        if (!args[0] || !["head", "tail"].includes(args[0].toLowerCase())) {
            return api.sendMessage("⚠️ Usage: .coinflip head/tail amount\nExample: .cf tail 500", threadID);
        }

        const choice = args[0].toLowerCase();

        if (!args[1] || isNaN(args[1]) || args[1] <= 0) {
            return api.sendMessage("⚠️ Bet amount দাও (number)!\nExample: .coinflip head 500", threadID);
        }

        const bet = parseInt(args[1]);
        const userMoney = await money.get(senderID);

        if (bet > userMoney) {
            return api.sendMessage(`❌ তোমার ব্যালেন্সে যথেষ্ট coin নেই!\nBalance: ${userMoney}`, threadID);
        }

        if (bet < 10) {
            return api.sendMessage("⚠️ Minimum bet 10 coin!", threadID);
        }

        const oldBalance = userMoney;

        if (!fs.existsSync(GIF_PATH)) {
            return api.sendMessage("❌ GIF এখনো download হয়নি। ৫ সেকেন্ড পর আবার চেষ্টা করো।", threadID);
        }

        api.sendMessage({
            body: "🪙 Coin is flipping... 🎰",
            attachment: fs.createReadStream(GIF_PATH)
        }, threadID, async (err, info) => {

            if (err) {
                console.error(err);
                return api.sendMessage("❌ GIF send করতে সমস্যা হয়েছে।", threadID);
            }

            await new Promise(resolve => setTimeout(resolve, 2500));

            try {
                await api.unsendMessage(info.messageID);
            } catch {}

            const coinResult = Math.random() < 0.5 ? "head" : "tail";
            const win = choice === coinResult;

            let replyText = "";
            const formattedResult = coinResult === "head" ? "𝐇𝐄𝐀𝐃𝐒" : "𝐓𝐀𝐈𝐋𝐒";

            if (win) {
                await money.add(senderID, bet);
                const newBalance = await money.get(senderID);

                replyText =
`╔══════════════╗
        🎰 COIN FLIP 🎰
╚══════════════╝

🪙 Result: ${formattedResult}

🎉 𝐕𝐈𝐂𝐓𝐎𝐑𝐘!
━━━━━━━━━━━━━━━━━━
💰 Bet Amount  : ${bet}
🏆 Profit       : +${bet}
💵 Old Balance : ${oldBalance}
💎 New Balance : ${newBalance}
━━━━━━━━━━━━━━━━━━
🔥 Luck is on your side!`;

            } else {
                await money.subtract(senderID, bet);
                const newBalance = await money.get(senderID);

                replyText =
`╔══════════════╗
        🎰 COIN FLIP 🎰
╚══════════════╝

🪙 Result: ${formattedResult}

💀 𝐃𝐄𝐅𝐄𝐀𝐓!
━━━━━━━━━━━━━━━━━━
💰 Bet Amount  : ${bet}
💸 Loss         : -${bet}
💵 Old Balance : ${oldBalance}
💎 New Balance : ${newBalance}
━━━━━━━━━━━━━━━━━━
😢 Better luck next time!`;
            }

            api.sendMessage(replyText, threadID);
        });
    }
};