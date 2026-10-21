module.exports = {
  config: {
    name: "count2",
    version: "3.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Message count system (text only)",
    longDescription: "View message leaderboard & personal stats (since bot joined)",
    category: "Group",
    guide: {
      en: "{pn} → your stats\n{pn} @tag / reply → user stats\n{pn} all → leaderboard"
    }
  },

  // 🔁 Count messages on every chat
  onChat: async function ({ event, threadsData, usersData }) {
    const { threadID, senderID } = event;

    try {
      const members = await threadsData.get(threadID, "members") || [];
      let user = members.find(u => u.userID == senderID);

      if (!user) {
        members.push({
          userID: senderID,
          name: await usersData.getName(senderID),
          count: 1
        });
      } else {
        user.count = (user.count || 0) + 1;
      }

      await threadsData.set(threadID, members, "members");
    } catch (err) {
      console.error("Count error:", err);
    }
  },

  // 📊 Show stats
  onStart: async function ({ args, threadsData, message, event }) {
    const { threadID, senderID, mentions, type, messageReply } = event;

    const threadData = await threadsData.get(threadID);
    if (!threadData || !threadData.members) {
      return message.reply("❌ No data found.");
    }

    let members = threadData.members;

    // sort & rank
    members.sort((a, b) => (b.count || 0) - (a.count || 0));
    members.forEach((u, i) => u.rank = i + 1);

    // 🏆 LEADERBOARD
    if (args[0]?.toLowerCase() === "all") {
      const top = members.slice(0, 15);

      let text = "🏆 𝗠𝗘𝗦𝗦𝗔𝗚𝗘 𝗟𝗘𝗔𝗗𝗘𝗥𝗕𝗢𝗔𝗥𝗗 🏆\n";
      text += "━━━━━━━━━━━━━━━━━━\n";

      for (const user of top) {
        text += `#${user.rank} ┃ ${user.name}\n`;
        text += `💬 ${user.count || 0} messages\n\n`;
      }

      text += "━━━━━━━━━━━━━━━━━━\n";
      text += "📌 Since bot joined group";

      return message.reply(text);
    }

    // 👤 TARGET USERS
    let targetUsers = [];
    if (type === "message_reply") {
      targetUsers = [messageReply.senderID];
    } else if (Object.keys(mentions).length > 0) {
      targetUsers = Object.keys(mentions);
    } else {
      targetUsers = [senderID];
    }

    let output = "";

    for (const uid of targetUsers) {
      const user = members.find(u => u.userID == uid);
      if (!user) continue;

      output += "👤 𝗨𝗦𝗘𝗥 𝗦𝗧𝗔𝗧𝗦\n";
      output += "━━━━━━━━━━━━━━\n";
      output += `📛 Name : ${user.name}\n`;
      output += `🏆 Rank : #${user.rank}\n`;
      output += `💬 Messages : ${user.count || 0}\n`;
      output += "━━━━━━━━━━━━━━\n\n";
    }

    return message.reply(output || "❌ No data found.");
  }
};
