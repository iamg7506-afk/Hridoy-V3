const axios = require("axios");

const baseApiUrl = async () => {
        const res = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return res.data.mahmud;
};

module.exports = {
        config: {
                name: "getlink",
                version: "1.8",
                author: "MahMUD",
                countDown: 10,
                role: 0,
                description: {
                        bn: "মিডিয়া ফাইল থেকে বিভিন্ন সার্ভারের লিঙ্ক তৈরি করুন",
                        en: "Generate links from media files using various servers",
                        vi: "Tạo liên kết từ các tệp phương tiện bằng nhiều máy chủ khác nhau"
                },
                category: "AI",
                guide: {
                        bn: '   {pn} <server>: রিপ্লাই দিয়ে সার্ভার নাম লিখুন (i/cb/img/t)',
                        en: '   {pn} <server>: Reply and specify server (i/cb/img/t)',
                        vi: '   {pn} <server>: Phản hồi và chỉ định máy chủ (i/cb/img/t)'
                }
        },

        langs: {
                bn: {
                        noMedia: "× বেবি, একটি ছবি/ভিডিও/অডিওতে রিপ্লাই দাও! 🖼️",
                        success: "✅ | এই নাও তোমার %1 লিঙ্ক বেবি <😘\n\n%2",
                        error: "× সমস্যা হয়েছে: %1। প্রয়োজনে Contact Kakashi"
                },
                en: {
                        noMedia: "× Baby, please reply to an image/video/audio! 🖼️",
                        success: "✅ | Here is your %1 url baby <😘\n\n%2",
                        error: "× API error: %1. Contact Kakashi for help."
                },
                vi: {
                        noMedia: "× Cưng ơi, hãy phản hồi một tệp phương tiện! 🖼️",
                        success: "✅ | Liên kết %1 của cưng đây <😘\n\n%2",
                        error: "× Lỗi: %1. Liên hệ Kakashi để hỗ trợ."
                }
        },

        onStart: async function ({ api, message, args, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                try {
                        const { messageReply, type } = event;
                        if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments.length === 0) {
                                return message.reply(getLang("noMedia"));
                        }

                        api.setMessageReaction("⌛", event.messageID, () => {}, true);
                        
                        const input = args[0]?.toLowerCase();
                        const baseUrl = await baseApiUrl();
                        let num = 0;
                        let linksText = "";
                        let serverName = "Direct";

                        // Server Logic
                        for (const att of messageReply.attachments) {
                                num++;
                                let link = att.url;
                                
                                if (["tinyurl", "t", "--t"].includes(input)) {
                                        serverName = "TinyURL";
                                        const res = await axios.get(`${baseUrl}/api/tinyurl?url=${encodeURIComponent(att.url)}`);
                                        link = res.data.link;
                                } else if (["imgbb", "img", "ibb"].includes(input)) {
                                        serverName = "ImgBB";
                                        const res = await axios.get(`${baseUrl}/api/imgbb?url=${encodeURIComponent(att.url)}`);
                                        link = res.data.link;
                                } else if (["imgur", "i", "--i"].includes(input)) {
                                        serverName = "Imgur";
                                        const res = await axios.get(`${baseUrl}/api/imgur?url=${encodeURIComponent(att.url)}`);
                                        link = res.data.link;
                                } else if (["catbox", "cb", "c", "--c"].includes(input)) {
                                        serverName = "Catbox";
                                        const res = await axios.get(`${baseUrl}/api/catbox?url=${encodeURIComponent(att.url)}`);
                                        link = res.data.link;
                                }
                                
                                linksText += `${num}. ${link}\n`;
                        }

                        api.setMessageReaction("✅", event.messageID, () => {}, true);
                        return message.reply(getLang("success", serverName, linksText));

                } catch (err) {
                        console.error("Getlink Error:", err);
                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                        return message.reply(getLang("error", err.message));
                }
        }
};
