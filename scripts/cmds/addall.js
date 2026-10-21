let isAdding = {};

module.exports = {
  config: {
		shortDescription: "Addall (Group)", // auto-added: was missing, caused blank entry in help
    name: "addall",
    version: "3.1",
    author: "HR ID OY",
    role: 1,
    category: "Group",
    guide: "{p}addall / {p}canceladd"
  },

  onStart: async function ({ api, event, args, message }) {
    const threadID = event.threadID;

    if (args[0] === "cancel" || args[0] === "stop") {
      isAdding[threadID] = false;
      return message.reply("🙅 Adding stopped!");
    }

    isAdding[threadID] = true;

    let friends = [];
    try {
      friends = await api.getFriendsList();
    } catch (e) {
      return message.reply("No Friend list Found");
    }

    let success = 0;
    let failed = 0;

    message.reply("💁 All members add now..\n\n (type: addall stop)");

    for (const user of friends) {
      if (!isAdding[threadID]) break;

      try {
        await api.addUserToGroup(user.userID, threadID);
        success++;
        await new Promise(r => setTimeout(r, 1200));
      } catch (e) {
        failed++;
      }
    }

    isAdding[threadID] = false;

    message.reply(
      `✅ Done!\n✔️ Success: ${success}\n❌ Failed: ${failed}`
    );
  }
};
