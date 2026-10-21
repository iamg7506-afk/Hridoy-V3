const util = require("util");

// যাদের জন্য EVAL access থাকবে
const SPECIAL_UIDS = [
  "100067155687291",
  "61595715143202"
];

module.exports = {
  config: {
    name: "eval",
    version: "1.3",
    author: "HR ID OY",
    countDown: 0,
    role: 2,
    shortDescription: "Run JavaScript code",
    longDescription: "Execute JavaScript with full bot access",
    category: "Admin",
    guide: {
      en: "{pn} <code>"
    }
  },

  onStart: async function ({
    message,
    args,
    api,
    event,
    usersData,
    threadsData,
    globalData
  }) {

    // Special UID check
    if (!SPECIAL_UIDS.includes(String(event.senderID))) {
      return message.reply(
        "❌ | You don't have permission to use EVAL."
      );
    }

    const code = args.join(" ");

    if (!code) {
      return message.reply(
        "❌ Please provide JavaScript code.\n\nExample:\n/eval 1+1"
      );
    }

    try {
      let result = await (async () => eval(code))();

      if (typeof result !== "string") {
        result = util.inspect(result, {
          depth: 2,
          colors: false
        });
      }

      if (result.length > 1900) {
        result =
          result.slice(0, 1900) +
          "\n...output truncated";
      }

      return message.reply(
        `🧪 EVAL RESULT\n────────────\n${result}`
      );

    } catch (err) {
      return message.reply(
        `❌ EVAL ERROR\n────────────\n${err.stack || err.toString()}`
      );
    }
  }
};
