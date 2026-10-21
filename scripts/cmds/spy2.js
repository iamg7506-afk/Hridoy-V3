const axios = require('axios');

// Inline font helpers (replaces missing ../../func/font.js)
const fonts = {
  bold: (t) => `${t}`,
  italic: (t) => `${t}`,
  sansSerif: (t) => `${t}`,
  monospace: (t) => `${t}`,
  fancy: (t) => `${t}`,
};

module.exports = {
  config: {
    name: "spy2",
    aliases: ["infospy2"],
    version: "2.2",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    description: {
      vi: "Xem thông tin chi tiết của người dùng",
      en: "View detailed information about a user including avatar"
    },
    category: "Tag Fun",
    guide: {
      en: "{pn} - Get your own detailed information\n{pn} @tag - Get tagged user's information\n{pn} <uid> - Get user information by ID\nReply to someone's message with {pn} to get their info"
    }
  },

  langs: {
    vi: {
      userNotFound: "Không tìm thấy thông tin người dùng",
      loadingInfo: "🔍 Đang tải thông tin người dùng...",
      errorOccurred: "❌ Có lỗi xảy ra khi lấy thông tin: %1"
    },
    en: {
      userNotFound: "User information not found",
      loadingInfo: "🔍 Loading user information...",
      errorOccurred: "❌ An error occurred while fetching information: %1"
    }
  },

  onStart: async function ({ message, api, event, args, usersData, threadsData, getLang }) {
    try {
      let targetUserID;

      if (event.messageReply) {
        targetUserID = event.messageReply.senderID;
      } else if (Object.keys(event.mentions).length > 0) {
        targetUserID = Object.keys(event.mentions)[0];
      } else if (args[0] && !isNaN(args[0])) {
        targetUserID = args[0];
      } else {
        targetUserID = event.senderID;
      }

      await message.reply(getLang("loadingInfo"));

      const userData = await usersData.get(targetUserID);
      const allUsers = await usersData.getAll();

      let fbUserInfo;
      try {
        const userInfoResult = await api.getUserInfo(targetUserID);
        fbUserInfo = userInfoResult[targetUserID];
      } catch (error) {
        console.log("Error getting FB user info:", error.message);
        fbUserInfo = null;
      }

      let threadInfo = null;
      let userThreadData = null;
      if (event.isGroup) {
        try {
          threadInfo = await threadsData.get(event.threadID);
          userThreadData = threadInfo.members?.find(m => m.userID === targetUserID);
        } catch (error) {
          console.log("Error getting thread info:", error.message);
        }
      }

      let attachment = [];
      try {
        const avatarUrl = await usersData.getAvatarUrl(targetUserID);
        if (avatarUrl) {
          const avatarStream = await global.utils.getStreamFromURL(avatarUrl);
          if (avatarStream) attachment = [avatarStream];
        }
      } catch {
        try {
          const profilePicUrl = `https://graph.facebook.com/${targetUserID}/picture?width=720&height=720`;
          const avatarStream = await global.utils.getStreamFromURL(profilePicUrl);
          if (avatarStream) attachment = [avatarStream];
        } catch {
          try {
            if (fbUserInfo?.thumbSrc) {
              const avatarStream = await global.utils.getStreamFromURL(fbUserInfo.thumbSrc);
              if (avatarStream) attachment = [avatarStream];
            }
          } catch {
            try {
              const basicUrl = `https://graph.facebook.com/${targetUserID}/picture?type=large`;
              const response = await axios.get(basicUrl, { responseType: 'stream' });
              if (response.data) {
                response.data.path = 'avatar.jpg';
                attachment = [response.data];
              }
            } catch (basicError) {
              console.log("All profile picture methods failed:", basicError.message);
            }
          }
        }
      }

      const userInfo = formatDetailedUserInfo(userData, fbUserInfo, userThreadData, threadInfo, targetUserID, event.isGroup, allUsers);

      if (attachment.length > 0) {
        await message.reply({ body: userInfo, attachment });
      } else {
        await message.reply(userInfo + `\n\n📸 Profile picture could not be retrieved`);
      }

    } catch (error) {
      console.error("Error in spy command:", error);
      message.reply(getLang("errorOccurred", error.message));
    }
  }
};

function formatDetailedUserInfo(userData, fbUserInfo, userThreadData, threadInfo, userID, isGroup, allUsers = []) {
  const divider = "━".repeat(12);
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const name        = String(userData?.name || fbUserInfo?.name || "Unknown User");
  const firstName   = String(fbUserInfo?.firstName || "Unknown");
  const lastName    = String(fbUserInfo?.lastName || "");
  const gender      = getGenderText(userData?.gender || fbUserInfo?.gender);
  const vanity      = String(userData?.vanity || fbUserInfo?.vanity || "Not set");
  const joinedDate  = userData?.createdAt  ? new Date(userData.createdAt).toLocaleDateString('en-US')  : "Unknown";
  const lastUpdate  = userData?.updatedAt  ? new Date(userData.updatedAt).toLocaleDateString('en-US')  : "Unknown";
  const money       = Number(userData?.money) || 0;
  const exp         = Number(userData?.exp)   || 0;
  const banned      = Boolean(userData?.banned?.status) || false;
  const banReason   = String(userData?.banned?.reason || "N/A");
  const banDate     = userData?.banned?.date ? new Date(userData.banned.date).toLocaleDateString('en-US') : "N/A";
  const isVerified  = fbUserInfo?.isVerified ? "✅ Verified Account" : "❌ Not Verified";
  const isFriend    = fbUserInfo?.isFriend   ? "👥 Friends"          : "👤 Not Friends";
  const birthday    = fbUserInfo?.isBirthday ? "🎂 Today is Birthday!" : "Not available";
  const accountType = String(fbUserInfo?.type || "Unknown");
  const level       = Math.floor(exp / 1000) + 1;
  const nextLevelExp = (level * 1000) - exp;

  const sortedByExp   = [...allUsers].sort((a, b) => (b.exp   || 0) - (a.exp   || 0));
  const sortedByMoney = [...allUsers].sort((a, b) => (b.money || 0) - (a.money || 0));
  const expRank   = sortedByExp.findIndex(u   => u.userID == userID) + 1;
  const moneyRank = sortedByMoney.findIndex(u => u.userID == userID) + 1;
  const totalUsers = allUsers.length;
  const totalCommands = Number(userData?.totalCommands) || 0;

  let threadSpecificInfo = "";
  if (isGroup && userThreadData) {
    const nickname     = String(userThreadData.nickname || "Not set");
    const joinedGroup  = userThreadData.joinedDate ? new Date(userThreadData.joinedDate).toLocaleDateString('en-US') : "Unknown";
    const isAdmin      = Boolean(userThreadData.isAdmin) || false;
    const messageCount = Number(userThreadData.count) || 0;

    threadSpecificInfo =
      `💬 GROUP INFORMATION\n` +
      `🏷️ Nickname: ${nickname}\n` +
      `📅 Joined Group: ${joinedGroup}\n` +
      `👑 Admin Status: ${isAdmin ? "✅ Admin" : "❌ Member"}\n` +
      `💬 Messages Sent: ${messageCount.toLocaleString()}\n` +
      `📍 Group Name: ${String(threadInfo?.threadName || "Unknown")}\n\n`;
  }

  return (
    `SPY\n${divider}\n\n` +

    `👤 PERSONAL INFORMATION\n` +
    `📝 Full Name: ${name}\n` +
    `👤 First Name: ${firstName}\n` +
    `👥 Last Name: ${lastName}\n` +
    `🆔 User ID: ${userID}\n` +
    `⚧️ Gender: ${gender}\n` +
    `🔗 Username: ${vanity}\n` +
    `🎂 Birthday: ${birthday}\n` +
    `🌐 Profile URL: facebook.com/${vanity !== "Not set" ? vanity : userID}\n\n` +

    `📱 ACCOUNT STATUS\n` +
    `🏷️ Account Type: ${accountType}\n` +
    `✅ Verification: ${isVerified}\n` +
    `👥 Friendship: ${isFriend}\n` +
    `🚫 Banned: ${banned ? "❌ Yes" : "✅ No"}\n` +
    (banned ? `📝 Ban Reason: ${banReason}\n📅 Ban Date: ${banDate}\n` : "") +
    `\n` +

    `🤖 BOT DATABASE\n` +
    `📅 First Joined: ${joinedDate}\n` +
    `🔄 Last Update: ${lastUpdate}\n` +
    `💰 Balance: ${money.toLocaleString()}$\n` +
    `⭐ Experience: ${exp.toLocaleString()} XP\n` +
    `🎯 Level: ${level}\n` +
    `📈 Next Level: ${nextLevelExp} XP needed\n\n` +

    threadSpecificInfo +

    `📊 PROFILE STATISTICS\n` +
    `🌟 Profile Score: ${calculateProfileScore(exp, money, totalCommands)}\n` +
    `🏆 User Rank: ${getUserRank(exp)}\n` +
    `📈 EXP Ranking: #${expRank} out of ${totalUsers} users\n` +
    `💰 Money Ranking: #${moneyRank} out of ${totalUsers} users\n` +
    `🕐 Report Generated: ${timestamp} (IST)`
  );
}

function getGenderText(gender) {
  if (!gender) return "⚧️ Not specified";
  switch (gender) {
    case 1: case "female": return "👩 Female";
    case 2: case "male":   return "👨 Male";
    default:               return "⚧️ Other/Custom";
  }
}

function calculateProfileScore(exp, money, commands) {
  return Math.floor(exp / 100) + Math.floor(money / 1000) + (commands * 10);
}

function getUserRank(exp) {
  if (exp < 1000)   return "🥉 Newbie";
  if (exp < 5000)   return "🥈 Beginner";
  if (exp < 10000)  return "🥇 Intermediate";
  if (exp < 25000)  return "🏆 Advanced";
  if (exp < 50000)  return "💎 Expert";
  if (exp < 100000) return "👑 Master";
  return "🌟 Legend";
}