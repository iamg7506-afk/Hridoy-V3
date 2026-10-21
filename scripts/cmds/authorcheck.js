const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "authorcheck",
    aliases: ["authors", "cmdauthors", "cmdauthor"],
    version: "3.0.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Show command authors",
    longDescription:
      "Show command authors and reply with a number to view their commands.",
    category: "System",

    guide: {
      en:
        "{pn}\n" +
        "{pn} <number>\n" +
        "{pn} <author name>\n\n" +
        "Example:\n" +
        "{pn} 1\n" +
        "{pn} Hridoy"
    }
  },

  onStart: async function ({ message, args, event, commandName }) {
    try {
      const cmdDir = __dirname;

      if (!fs.existsSync(cmdDir)) {
        return message.reply("❌ Command directory পাওয়া যায়নি!");
      }

      const files = fs
        .readdirSync(cmdDir)
        .filter(file =>
          file.endsWith(".js") &&
          file !== "authorcheck.js"
        );

      const authors = {};

      for (const file of files) {
        try {
          const filePath = path.join(cmdDir, file);

          try {
            delete require.cache[require.resolve(filePath)];
          } catch (e) {}

          const command = require(filePath);

          if (!command || !command.config) continue;

          const commandName =
            command.config.name ||
            file.replace(".js", "");

          let author =
            command.config.author || "Unknown";

          if (Array.isArray(author)) {
            author = author.join(", ");
          }

          author = String(author).trim();

          if (!author) author = "Unknown";

          if (!authors[author]) {
            authors[author] = [];
          }

          if (!authors[author].includes(commandName)) {
            authors[author].push(commandName);
          }

        } catch (error) {
          console.log(
            `[AuthorCheck] Skipped: ${file}`
          );
        }
      }

      let authorNames = Object.keys(authors);

      if (!authorNames.length) {
        return message.reply(
          "❌ কোনো command author পাওয়া যায়নি!"
        );
      }

      // Sort: বেশি command আগে
      authorNames.sort((a, b) => {
        const countA = authors[a].length;
        const countB = authors[b].length;

        if (countB !== countA) {
          return countB - countA;
        }

        return a.localeCompare(
          b,
          undefined,
          { sensitivity: "base" }
        );
      });

      // Sort commands alphabetically
      for (const author of authorNames) {
        authors[author].sort((a, b) =>
          a.localeCompare(b, undefined, {
            sensitivity: "base"
          })
        );
      }

      // ============================================
      // DIRECT NUMBER
      // .authorcheck 1
      // ============================================

      if (
        args.length === 1 &&
        /^\d+$/.test(args[0])
      ) {
        const number = parseInt(args[0], 10);

        if (
          number < 1 ||
          number > authorNames.length
        ) {
          return message.reply(
            `❌ Author #${number} পাওয়া যায়নি!\n\n` +
            `👥 Total Authors : ${authorNames.length}\n` +
            `👉 1 থেকে ${authorNames.length} এর মধ্যে number দিন।`
          );
        }

        const selectedAuthor =
          authorNames[number - 1];

        return sendAuthorCommands(
          message,
          selectedAuthor,
          authors[selectedAuthor],
          number
        );
      }

      // ============================================
      // AUTHOR NAME
      // .authorcheck Hridoy
      // ============================================

      if (args.length > 0) {
        const searchName = args
          .join(" ")
          .trim()
          .toLowerCase();

        const selectedAuthor =
          authorNames.find(author =>
            author.toLowerCase() === searchName
          );

        if (selectedAuthor) {
          const number =
            authorNames.indexOf(selectedAuthor) + 1;

          return sendAuthorCommands(
            message,
            selectedAuthor,
            authors[selectedAuthor],
            number
          );
        }
      }

      // ============================================
      // MAIN AUTHOR LIST
      // ============================================

      let msg =
        "╭━━━〔 👤 AUTHOR CHECK 〕━━━╮\n" +
        `┃ 📦 Commands : ${Object.values(authors)
          .reduce((a, b) => a + b.length, 0)}\n` +
        `┃ 👥 Authors  : ${authorNames.length}\n` +
        "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n";

      authorNames.forEach((author, index) => {
        msg += `${index + 1}️⃣ ${author} — ${authors[author].length} commands\n`;
      });

      msg +=
        "\n━━━━━━━━━━━━━━━━━━━━━━\n" +
        "💬 Reply with author number\n" +
        "📌 Example: Reply → 1";

      // ============================================
      // IMPORTANT
      // GoatBot reply listener
      // ============================================

      return message.reply(msg, (err, info) => {
        if (err) {
          console.error(
            "[AuthorCheck] Reply registration error:",
            err
          );
          return;
        }

        global.GoatBot.onReply.set(
          info.messageID,
          {
            commandName,
            messageID: info.messageID,
            author: event.senderID,
            type: "authorcheck",
            authorNames,
            authors
          }
        );
      });

    } catch (error) {
      console.error(
        "[AuthorCheck] Error:",
        error
      );

      return message.reply(
        "❌ AuthorCheck চালাতে সমস্যা হয়েছে!"
      );
    }
  },

  // ============================================
  // REPLY HANDLER
  // ============================================

  onReply: async function ({
    message,
    event,
    Reply
  }) {
    try {
      // শুধু original user
      if (
        String(event.senderID) !==
        String(Reply.author)
      ) {
        return;
      }

      const input =
        String(event.body || "").trim();

      // Number ছাড়া অন্য কিছু হলে
      if (!/^\d+$/.test(input)) {
        return message.reply(
          `❌ শুধু author number দিন!\n\n` +
          `📌 Example: 1\n` +
          `📌 Available: 1-${Reply.authorNames.length}`
        );
      }

      const number =
        parseInt(input, 10);

      if (
        number < 1 ||
        number > Reply.authorNames.length
      ) {
        return message.reply(
          `❌ Invalid author number!\n\n` +
          `👥 Total Authors : ${Reply.authorNames.length}\n` +
          `👉 1 থেকে ${Reply.authorNames.length} এর মধ্যে দিন।`
        );
      }

      const selectedAuthor =
        Reply.authorNames[number - 1];

      const commands =
        Reply.authors[selectedAuthor] || [];

      return sendAuthorCommands(
        message,
        selectedAuthor,
        commands,
        number
      );

    } catch (error) {
      console.error(
        "[AuthorCheck Reply] Error:",
        error
      );

      return message.reply(
        "❌ Author commands load করতে সমস্যা হয়েছে!"
      );
    }
  }
};


// ============================================
// SEND AUTHOR COMMANDS
// ============================================

async function sendAuthorCommands(
  message,
  author,
  commands,
  number
) {
  let msg =
    `╭━━━〔 👤 ${author} 〕━━━╮\n` +
    `┃ 🔢 Author #${number}\n` +
    `┃ 📊 Commands : ${commands.length}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

  commands.forEach((command, index) => {
    msg += `${index + 1}. ${command}\n`;
  });

  msg +=
    "\n━━━━━━━━━━━━━━━━━━━━━━\n" +
    "⚡ AUTHOR CHECK";

  return message.reply(msg);
}