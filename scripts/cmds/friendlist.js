const PAGE_SIZE = 10;

module.exports = {
  config: {
    name: "friendlist",
    aliases: ["flist"],
    version: "1.2",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    category: "Utility",
    shortDescription: {
      en: "Bot account-er friend list page akare dekhay"
    },
    longDescription: {
      en:
        "Bot-er Facebook account-er shob friend-er list page akare dekhay. " +
        "Message-e (jekono emoji diye) react korle next page ashbe (age-r page auto unsend hoye jabe). " +
        "Reply kore number dile shei number-er friend ke unfriend kora jabe."
    },
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event, message }) {
    api.getFriendsList(async (err, list) => {
      if (err || !list) {
        return message.reply("❌ Friend list anhte problem hoise: " + (err ? err.error || err : "unknown error"));
      }
      if (list.length === 0) {
        return message.reply("Bot account-er kono friend nai.");
      }

      const totalPages = Math.ceil(list.length / PAGE_SIZE);
      await sendPage({ api, message, author: event.senderID, threadID: event.threadID }, list, 0, totalPages);
    });
  },

  onReaction: async function ({ api, event, Reaction }) {
    if (!Reaction) return;
    // Bot nijer account-er reaction hole ignore kora hocche
    if (event.userID == api.getCurrentUserID()) return;
    if (event.userID != Reaction.author) return;

    const { list, page, totalPages, threadID, author } = Reaction;

    // Age-r page message ta unsend kore dewa hocche
    api.unsendMessage(event.messageID);
    global.GoatBot.onReaction.delete(event.messageID);
    global.GoatBot.onReply.delete(event.messageID);

    if (page + 1 >= totalPages) {
      return api.sendMessage("ℹ️ Eta shesh page silo, r kono page nai.", threadID);
    }

    await sendPage({ api, threadID, author }, list, page + 1, totalPages);
  },

  onReply: async function ({ api, event, Reply, message }) {
    if (!Reply) return;
    const { list, page, author } = Reply;

    if (event.senderID != author) return;

    const input = event.body.trim();
    const num = parseInt(input);

    if (isNaN(num) || num < 1 || num > PAGE_SIZE) {
      return message.reply("⚠️ Sudhu list e dekha number ta reply e din (jemon: 1, 2, 3 ...).");
    }

    const realIndex = page * PAGE_SIZE + (num - 1);
    const friend = list[realIndex];

    if (!friend) {
      return message.reply("⚠️ Eta number-e kono friend paoa jayni.");
    }

    api.unfriend(friend.userID, (err) => {
      if (err) {
        return message.reply(`❌ "${friend.fullName}" ke unfriend korte problem hoise.`);
      }
      return message.reply(`✅ "${friend.fullName}" ke unfriend kora hoise.`);
    });
  }
};

async function sendPage(ctx, list, page, totalPages) {
  const { api, message, threadID, author } = ctx;
  const start = page * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  let text = `👥 FRIEND LIST (Page ${page + 1}/${totalPages})\n`;
  text += "─────────────────────\n";
  pageItems.forEach((friend, i) => {
    text += `${i + 1}. ${friend.fullName}\n`;
  });
  text += "─────────────────────\n";
  text += "👉 Jekono emoji diye react korun next page dekhte.\n";
  text += "Unfriend korte chaile, upore-r number ta reply diye pathan.";

  let info;
  try {
    if (message) {
      info = await message.reply(text);
    } else {
      info = await api.sendMessage(text, threadID);
    }
  } catch (e) {
    return;
  }

  if (!info || !info.messageID) return;

  const targetThreadID = info.threadID || threadID;

  const data = {
    commandName: "friendlist",
    messageID: info.messageID,
    author,
    list,
    page,
    totalPages,
    threadID: targetThreadID
  };

  global.GoatBot.onReaction.set(info.messageID, data);
  global.GoatBot.onReply.set(info.messageID, data);
}
