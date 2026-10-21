module.exports = {
    config: {
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
        name: "friendrequest",
        aliases: ["addfriend", "fr"],
        version: "1.1",
        author: "HR ID OY",
        countDown: 5,
        role: 2,
        description: "Send friend request to everyone in all groups bot is in",
        category: "Admin"
    },

    onStart: async function ({ message, api, event, threadsData, usersData }) {
        try {
            const senderID = event.senderID;
            const delayPerUser = 500;

            // Get all groups
            const allThreads = (await threadsData.getAll()).filter(t => t.isGroup);

            if (allThreads.length === 0) {
                return message.reply("❌ No groups found");
            }

            // Collect all unique users
            const allUsers = new Set();

            for (const thread of allThreads) {
                if (!thread.members || thread.members.length === 0) continue;

                for (const member of thread.members) {
                    if (member.userID && member.userID != senderID && member.userID != api.getCurrentUserID()) {
                        allUsers.add(member.userID);
                    }
                }
            }

            const userList = Array.from(allUsers);

            if (userList.length === 0) {
                return message.reply("❌ No users found to add");
            }

            await message.reply(`⏳ Sending friend requests to ${userList.length} users...\n\nThis will take a while...`);

            let successCount = 0;
            let failedCount = 0;

            for (const userID of userList) {
                try {
                    await api.addFriendRequest(userID);
                    successCount++;
                    console.log(`✅ Friend request sent to ${userID}`);
                } catch (e) {
                    failedCount++;
                    console.error(`❌ Failed to send request to ${userID}:`, e.message);
                }

                await new Promise(resolve => setTimeout(resolve, delayPerUser));
            }

            const resultMsg = `
✅ FRIEND REQUESTS SENT!

📊 Statistics:
✅ Sent: ${successCount} users
❌ Failed: ${failedCount} users
👥 Total Users: ${userList.length}
🔍 Groups Scanned: ${allThreads.length}

⏰ Check your friend requests!
            `;

            message.reply(resultMsg);

        } catch (e) {
            console.error("Friend request error:", e.message);
            message.reply("❌ Error: " + e.message);
        }
    }
};