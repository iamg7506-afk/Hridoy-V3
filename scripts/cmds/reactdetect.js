module.exports = {
  config: {
    name: "reactiondetect",
    version: "1.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Detect message reactions",
    longDescription: "Detect reactions on bot messages",
    category: "System",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    const msg = await message.reply(
      "📌 React to this message and I'll detect it."
    );

    global.GoatBot.onReaction.set(msg.messageID, {
      commandName: this.config.name
    });
  },

  onReaction: async function ({ event, api, usersData }) {
    const { userID, reaction, threadID, messageID } = event;

    try {
      const user = await usersData.get(userID).catch(() => null);
      const name = user?.name || "Unknown User";

      api.sendMessage(
        `🎭 Reaction Detected!\n\n` +
        `👤 User: ${name}\n` +
        `🆔 UID: ${userID}\n` +
        `😀 Reaction: ${reaction || "Removed"}\n` +
        `💬 Message ID: ${messageID}`,
        threadID
      );
    } finally {
      // Always clear the tracked message, even if something above threw,
      // so a failed lookup can't leave this entry stuck in memory forever.
      global.GoatBot.onReaction.delete(messageID);
    }
  }
};
