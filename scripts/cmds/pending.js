module.exports = {
    config: {
        name: "pending",
        aliases: ["pen", "approve", "পেন্ডিং"],
        version: "2.2",
        author: "HR ID OY",
        countDown: 10,
        role: 2,
        description: {
            bn: "বটের পেন্ডিং গ্রুপগুলো দেখুন এবং অ্যাপ্রুভ করুন (অ্যাডমিন)",
            en: "View and approve pending group requests for the bot (Admin)",
            vi: "Xem và phê duyệt các yêu cầu nhóm đang chờ xử lý cho bot (Quản trị viên)"
        },
        category: "Utility",
        guide: {
            bn: '{pn}: পেন্ডিং লিস্ট → রিপ্লাই দিয়ে অ্যাপ্রুভ (উদা: 1 2)',
            en: '{pn}: View list → Reply with index (Ex: 1 2)',
            vi: '{pn}: Xem danh sách → Trả lời số (VD: 1 2)'
        }
    },

    langs: {
        bn: {
            noPending: "× কোনো গ্রুপ পেন্ডিং কিউতে নেই! 😴",
            listHeader: "📋 মোট পেন্ডিং গ্রুপ: %1টি\n",
            replyGuide: "\n• অ্যাপ্রুভ করতে নম্বর দিয়ে রিপ্লাই দিন (1 2 3)",
            successNotify: "বট এখন কানেক্টেড! !help ব্যবহার করুন ✨",
            approvedBy: "এই গ্রুপটি %1 দ্বারা অ্যাপ্রুভ করা হয়েছে।",
            done: "✅ %1টি গ্রুপ অ্যাপ্রুভ হয়েছে",
            error: "× সমস্যা: %1"
        },
        en: {
            noPending: "× No groups in pending queue! 😴",
            listHeader: "📋 Total Pending: %1\n",
            replyGuide: "\n• Reply index to approve (1 2 3)",
            successNotify: "Bot connected! Use .help ✨",
            approvedBy: "Approved by %1",
            done: "✅ Approved %1 group(s)",
            error: "× Error: %1"
        }
    },

    onReply: async function ({ api, event, Reply, usersData, getLang }) {

        // 🔥 FIX: author lock remove
        // (আগের MahMUD check delete করা হয়েছে)

        const { author, pending } = Reply;
        if (String(event.senderID) !== String(author)) return;

        const index = event.body.split(/\s+/);
        let count = 0;

        try {
            api.setMessageReaction("⏳", event.messageID, () => {}, true);
            const name = await usersData.getName(event.senderID);

            const botName = global.GoatBot.config.nickNameBot || "✦ 𝙏𝙊𝙍𝙐 𝘾𝙃𝘼𝙉 ✦";

            for (const i of index) {
                if (isNaN(i) || i <= 0 || i > pending.length) continue;

                const target = pending[i - 1];

                try {
                    await api.changeNickname(
                        botName,
                        target.threadID,
                        api.getCurrentUserID()
                    );
                } catch (e) {}

                await api.sendMessage(getLang("successNotify"), target.threadID);
                await api.sendMessage(getLang("approvedBy", name), target.threadID);

                count++;
            }

            api.setMessageReaction("✅", event.messageID, () => {}, true);
            return api.sendMessage(getLang("done", count), event.threadID, event.messageID);

        } catch (err) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return api.sendMessage(getLang("error", err.message), event.threadID, event.messageID);
        }
    },

    onStart: async function ({ api, event, getLang, message }) {

        // 🔥 FIX: author lock remove

        try {
            api.setMessageReaction("⏳", event.messageID, () => {}, true);

            const spam = await api.getThreadList(100, null, ["OTHER"]) || [];
            const pend = await api.getThreadList(100, null, ["PENDING"]) || [];

            const list = [...spam, ...pend].filter(g => g.isSubscribed && g.isGroup);

            if (list.length === 0) {
                api.setMessageReaction("🥺", event.messageID, () => {}, true);
                return message.reply(getLang("noPending"));
            }

            let msg = getLang("listHeader", list.length);

            list.forEach((g, i) => {
                msg += `${i + 1}. ${g.name || "Unknown Group"} (${g.threadID})\n`;
            });

            msg += getLang("replyGuide");

            return message.reply(msg, (err, info) => {
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: this.config.name,
                    author: event.senderID,
                    pending: list
                });
            });

        } catch (err) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return message.reply(getLang("error", err.message));
        }
    }
};
