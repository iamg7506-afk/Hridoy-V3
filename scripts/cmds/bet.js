const money = require("../../utils/money");

module.exports = {
  config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
    name: "bet",
    version: "3.1",
    author: "HR ID OY",
    role: 0,
    category: "Game",
    shortDescription: "Casino betting game"
  },

  onStart: async function ({ api, event, args }) {
    const { senderID, threadID, messageID } = event;

    if (!args[0]) {
      return api.sendMessage(
        "🎰 Usage: bet <amount>",
        threadID,
        messageID
      );
    }

    let bet;

    if (args[0].toLowerCase() === "all") {
      bet = await money.get(senderID);
    } else {
      bet = parseInt(args[0]);
    }

    if (isNaN(bet) || bet <= 0) {
      return api.sendMessage(
        "❌ Invalid bet amount!",
        threadID,
        messageID
      );
    }

    let balance = await money.get(senderID);

    if (balance < bet) {
      return api.sendMessage(
        `❌ Not enough balance!\n🏦 Balance: ${balance}$`,
        threadID,
        messageID
      );
    }

    const outcomes = [
      { text: "💥 You lost everything!", multiplier: 0 },
      { text: "😞 You got back half.", multiplier: 0.5 },
      { text: "🟡 You broke even.", multiplier: 1 },
      { text: "🟢 You doubled your money!", multiplier: 2 },
      { text: "🔥 You tripled your bet!", multiplier: 3 },
      { text: "🎉 JACKPOT! 10x reward!", multiplier: 10 }
    ];

    const win = Math.random() < 0.6;
    let selected;

    if (win) {
      const winOutcomes = outcomes.filter(o => o.multiplier > 0);
      selected = winOutcomes[Math.floor(Math.random() * winOutcomes.length)];
    } else {
      selected = outcomes[0];
    }

    const reward = Math.floor(bet * selected.multiplier);
    const newBalance = balance - bet + reward;

    await money.set(senderID, newBalance);

    const msg = `${selected.text}

🎰 You bet: ${bet}$
💸 You won: ${reward}$
💰 New balance: ${newBalance}$`;

    return api.sendMessage(
      msg,
      threadID,
      messageID
    );
  }
};