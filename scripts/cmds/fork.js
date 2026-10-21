module.exports = {
        config: {
                name: "fork",
                version: "1.8",
                author: "HR ID OY",
                countDown: 5,
                role: 0,
                description: {
                        bn: "বোটের গিটহাব লিঙ্ক এবং টিউটোরিয়াল ভিডিও পান",
                        en: "Get the GitHub fork link and tutorial video",
                        vi: "Lấy liên kết fork GitHub và video hướng dẫn"
                },
                category: "Utility",
                guide: {
                        bn: '   {pn}: গিটহাব লিঙ্ক পেতে',
                        en: '   {pn}: Get the fork link',
                        vi: '   {pn}: Lấy liên kết fork'
                }
        },

        onStart: async function ({ api, message, event }) {

                const githubLink = "https://www.pornhub.com";
                const youtubeLink = "বালডা ও করতে পারবি না টিউটোরিয়াল দিয়ে।";

                const response = `
╭───⭓ 𝗙𝗢𝗥𝗞 𝗜𝗡𝗙𝗢
│ 🔗 GitHub: ${githubLink}
│ 🎥 Tutorial: ${youtubeLink}
╰──────────────⭓
`;

                return api.sendMessage(response, event.threadID, event.messageID);
        }
};
