const axios = require("axios");
const fs = require("fs");
const path = require("path");

const baseApiUrl = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "gcimg",
                aliases: ["gcimage"],
                version: "1.8",
                author: "MahMUD",
                countDown: 10,
                role: 0,
                description: {
                        en: "Generate group grid image with border details",
                        bn: "গ্রুপ গ্রিড ইমেজ এবং বর্ডার ডিটেইলস তৈরি করুন",
                        vi: "Tạo ảnh lưới nhóm với các chi tiết viền"
                },
                category: "Group",
                guide: {
                        en: "{pn} [--style 1/2] [--color white] [--admincolor red] [--membercolor cyan] [--bgcolor black] [--groupBorder lime] [--glow true]",
                        bn: "{pn} [--style 1/2] [--color white] [--admincolor red] [--membercolor cyan] [--bgcolor black] [--groupBorder lime] [--glow true]",
                        vi: "{pn} [--style 1/2] [--color white] [--admincolor red] [--membercolor cyan] [--bgcolor black] [--groupBorder lime] [--glow true]"
                }
        },

        langs: {
                bn: {
                        generating: "✅ | আপনার ইমেজ তৈরি হচ্ছে... অপেক্ষা করুন",
                        error: "❌ An error occurred: contact MahMUD %1",
                        success: "✅ 𝐇𝐞𝐫𝐞 𝐢𝐬 𝐲𝐨𝐮𝐫 𝐢𝐦𝐚𝐠𝐞\n\n• 𝐒𝐭𝐲𝐥𝐞: %1\n• 𝐂𝐨𝐥𝐨𝐫: %2\n• 𝐀𝐝𝐦𝐢𝐧 𝐂𝐨𝐥𝐨𝐫: %3\n• 𝐌𝐞𝐦𝐛𝐞𝐫 𝐂𝐨𝐥𝐨𝐫: %4\n• 𝐁𝐚𝐜𝐤𝐠𝐫𝐨𝐮𝐧𝐝: %5\n• 𝐆𝐫𝐨𝐮𝐩 𝐁𝐨𝐫𝐝𝐞𝐫: %6\n• 𝐆𝐥𝐨𝐰: %7"
                },
                en: {
                        generating: "✅ | Generating your image... please wait",
                        error: "❌ An error occurred: contact MahMUD %1",
                        success: "✅ 𝐇𝐞𝐫𝐞 𝐢𝐬 𝐲𝐨𝐮𝐫 𝐢𝐦𝐚𝐠𝐞\n\n• 𝐒𝐭𝐲𝐥𝐞: %1\n• 𝐂𝐨𝐥𝐨𝐫: %2\n• 𝐀𝐝𝐦𝐢𝐧 𝐂𝐨𝐥𝐨𝐫: %3\n• 𝐌𝐞𝐦𝐛𝐞𝐫 𝐂𝐨𝐥𝐨𝐫: %4\n• 𝐁𝐚𝐜𝐤𝐠𝐫𝐨𝐮𝐧𝐝: %5\n• 𝐆𝐫𝐨𝐮𝐩 𝐁𝐨𝐫𝐝𝐞𝐫: %6\n• 𝐆𝐥𝐨𝐰: %7"
                },
                vi: {
                        generating: "✅ | Đang tạo hình ảnh của bạn... vui lòng đợi",
                        error: "❌ An error occurred: contact MahMUD %1",
                        success: "✅ 𝐇𝐞𝐫𝐞 𝐢𝐬 𝐲𝐨𝐮𝐫 𝐢𝐦𝐚𝐠𝐞\n\n• 𝐒𝐭𝐲𝐥𝐞: %1\n• 𝐂𝐨𝐥𝐨𝐫: %2\n• 𝐀𝐝𝐦𝐢𝐧 𝐂𝐨𝐥𝐨𝐫: %3\n• 𝐌𝐞𝐦𝐛𝐞𝐫 𝐂𝐨𝐥𝐨𝐫: %4\n• 𝐁𝐚𝐜𝐤𝐠𝐫𝐨𝐮𝐧𝐝: %5\n• 𝐆𝐫𝐨𝐮𝐩 𝐁𝐨𝐫𝐝𝐞𝐫: %6\n• 𝐆𝐥𝐨𝐰: %7"
                }
        },

        onStart: async function ({ api, event, args, message, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                let waitMsg;
                const { threadID, messageID } = event;
                const cacheDir = path.join(__dirname, "cache");
                const cachePath = path.join(cacheDir, `gcimg_${threadID}_${Date.now()}.png`);

                try {
                        api.setMessageReaction("⏳", messageID, () => { }, true);
                        const params = {};

                        for (let i = 0; i < args.length; i++) {
                                switch (args[i]) {
                                        case "--style": params.style = args[i + 1]; i++; break;
                                        case "--color": params.color = args[i + 1]; i++; break;
                                        case "--admincolor": params.admincolor = args[i + 1]; i++; break;
                                        case "--membercolor": params.membercolor = args[i + 1]; i++; break;
                                        case "--bgcolor": params.bgcolor = args[i + 1]; i++; break;
                                        case "--glow": params.glow = args[i + 1]; i++; break;
                                        case "--groupBorder": params.groupBorder = args[i + 1]; i++; break;
                                }
                        }

                        const threadInfo = await api.getThreadInfo(threadID);
                        params.threadID = threadID;
                        params.threadName = threadInfo.threadName || "Unnamed Group";
                        params.participants = threadInfo.participantIDs.join(",");
                        params.admins = threadInfo.adminIDs.map(a => a.id || a).join(",");
                        params.groupImage = threadInfo.imageSrc || "";

                        waitMsg = await message.reply(getLang("generating"));

                        const baseUrl = await baseApiUrl();
                        const res = await axios.get(`${baseUrl}/api/gcimg`, { 
                                responseType: "arraybuffer", 
                                params 
                        });

                        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
                        fs.writeFileSync(cachePath, Buffer.from(res.data, "binary"));
                        
                        if (waitMsg) message.unsend(waitMsg.messageID);

                        const body = getLang("success", 
                                params.style || "𝐃𝐞𝐟𝐚𝐮𝐥𝐭", 
                                params.color || "𝐃𝐞𝐟𝐚𝐮𝐥𝐭", 
                                params.admincolor || "𝐃𝐞𝐟𝐚𝐮𝐥𝐭",
                                params.membercolor || "𝐃𝐞𝐟𝐚𝐮𝐥𝐭", 
                                params.bgcolor || "𝐃𝐞𝐟𝐚𝐮𝐥𝐭", 
                                params.groupBorder || "𝐃𝐞𝐟𝐚𝐮𝐥𝐭", 
                                params.glow || "𝐟𝐚𝐥𝐬𝐞"
                        );

                        return message.reply({
                                body: body,
                                attachment: fs.createReadStream(cachePath)
                        }, () => { 
                                api.setMessageReaction("🪽", messageID, () => { }, true);
                                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); 
                        });

                } catch (err) {
                        if (waitMsg) message.unsend(waitMsg.messageID);
                        api.setMessageReaction("❌", messageID, () => { }, true);
                        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
                        return message.reply(getLang("error", err.message || "API Error"));
                }
        }
};
                  
