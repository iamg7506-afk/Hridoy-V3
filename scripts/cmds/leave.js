module.exports = {
  config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
    name: "leave",
    aliases: ["boxleave"],
    version: "4.1",
    author: "HR ID OY",
    role: 2,
    shortDescription: "Advanced group leave system",
    category: "System",
    countDown: 10
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;
    const perPage = 10;

    try {
      const allThreads = await api.getThreadList(200, null, ["INBOX"]);
      const groups = allThreads.filter(t => t.isGroup && t.isSubscribed);

      if (!groups.length)
        return api.sendMessage("⚠️ Bot is not in any active group.", threadID, messageID);

      const page = 1;
      const start = 0;
      const end = perPage;
      const currentGroups = groups.slice(start, end);

      let msg = `📤 |  𝐆𝐑𝐎𝐔𝐏 𝐋𝐈𝐒𝐓 (𝐏𝐚𝐠𝐞 ${page})\n\n`;

      currentGroups.forEach((g, i) => {
        msg += `${start + i + 1}. ${g.name || "Unnamed Group"}\n`;
        msg += `🆔 ${g.threadID}\n`;
        msg += `👥 Members: ${g.participantIDs?.length || "Unknown"}\n\n`;
      });

      msg += "↩️ Reply with group number (Example: 1 or 2 5)\n";
      msg += "⚠️ Type 'all' to leave all groups\n";
      msg += "➡️ Type 'page 2' to see more";

      api.sendMessage(msg.trim(), threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: senderID,
          groups,
          page,
          perPage
        });
      }, messageID);

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Failed to fetch group list.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const input = event.body.trim().toLowerCase();
    const args = input.split(/\s+/);
    const perPage = Reply.perPage || 10;

    const goodbyeMessage =
`👋 Attention Everyone!
Under Kakashi’s direct command, I am leaving this group now.
Thank you for the memories. Until next time!`;

    // PAGE SYSTEM
    if (args[0] === "page") {
      const pageNum = parseInt(args[1]);
      if (isNaN(pageNum) || pageNum < 1)
        return api.sendMessage("❌ Invalid page number.", event.threadID);

      const start = (pageNum - 1) * perPage;
      const end = start + perPage;
      const currentGroups = Reply.groups.slice(start, end);

      if (!currentGroups.length)
        return api.sendMessage("⚠️ No more groups.", event.threadID);

      let msg = `📤 | GROUP LEAVE PANEL (PAGE ${pageNum})\n\n`;

      currentGroups.forEach((g, i) => {
        msg += `${start + i + 1}. ${g.name || "Unnamed Group"}\n`;
        msg += `🆔 ${g.threadID}\n`;
        msg += `👥 Members: ${g.participantIDs?.length || "Unknown"}\n\n`;
      });

      msg += "↩️ Reply with group number (Example: 1 or 2 5)\n";
      msg += "⚠️ Type 'all' to leave all groups";

      api.sendMessage(msg.trim(), event.threadID, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: Reply.commandName,
          author: Reply.author,
          groups: Reply.groups,
          page: pageNum,
          perPage
        });
      });

      return;
    }

    // LEAVE ALL
    if (input === "all") {
      let leftCount = 0;

      for (const group of Reply.groups) {
        try {
          await api.sendMessage(goodbyeMessage, group.threadID);
          await api.removeUserFromGroup(api.getCurrentUserID(), group.threadID);
          leftCount++;
          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }

      return api.sendMessage(`✅ Successfully left ${leftCount} groups.`, event.threadID);
    }

    // LEAVE BY NUMBER
    const numbers = args.map(n => parseInt(n)).filter(n => !isNaN(n));

    if (!numbers.length)
      return api.sendMessage("❌ Invalid input.", event.threadID);

    for (const num of numbers) {
      const index = num - 1;

      if (index < 0 || index >= Reply.groups.length) {
        await api.sendMessage(`❌ Invalid number: ${num}`, event.threadID);
        continue;
      }

      const group = Reply.groups[index];

      try {
        await api.sendMessage(goodbyeMessage, group.threadID);
        await api.removeUserFromGroup(api.getCurrentUserID(), group.threadID);

        await api.sendMessage(
          `✅ Successfully left: ${group.name}`,
          event.threadID
        );

      } catch {
        await api.sendMessage(
          `❌ Failed to leave: ${group.name}`,
          event.threadID
        );
      }
    }
  }
};