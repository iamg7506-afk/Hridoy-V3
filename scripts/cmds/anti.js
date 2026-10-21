const fs = require("fs-extra");
const path = require("path");
const { getStreamFromURL, uploadImgbb } = global.utils;

const antiPath = path.join(process.cwd(), "database", "data", "anti.json");

if (!fs.existsSync(path.dirname(antiPath))) {
  fs.mkdirSync(path.dirname(antiPath), { recursive: true });
}

if (!fs.existsSync(antiPath)) {
  fs.writeJsonSync(antiPath, {}, { spaces: 2 });
}

// থ্রেড ইনফো থেকে adminIDs আসে কখনো ["1234"] আকারে, কখনো [{id:"1234"}] আকারে —
// দুই ফরম্যাটই সামলে সবসময় প্লেইন স্ট্রিং আইডি-র অ্যারে রিটার্ন করে
function extractAdminIDs(threadInfo) {
  const raw = threadInfo?.adminIDs || [];
  return raw.map(a => String(typeof a === "object" && a !== null ? a.id : a));
}

module.exports = {
  config: {
    name: "anti",
    version: "10.5", // Updated version for fixes + admin bypass
    author: "HR ID OY",
    role: 1,
    category: "Admin",
    shortDescription: "Anti-Change Group Protection + Lock + Nickname Fix",
    longDescription: "Protect group name, avatar, theme, emoji, nicknames, join/out with backup and lock system. Group admins are always allowed to make changes; everyone else's changes are reverted while protection is on.",
    guide: {
      en: "{pn} → open menu\nReply with number 1-7 to toggle or 'lock' to toggle all"
    }
  },

  onStart: async function ({ message, event }) {
    const { threadID, senderID } = event;
    let data = fs.readJsonSync(antiPath);

    if (!data[threadID]) {
      data[threadID] = {
        name: false,
        avatar: false,
        nickname: false,
        theme: false,
        emoji: false,
        join: false,
        out: false,
        lock: false,
        backup: {}
      };
      fs.writeJsonSync(antiPath, data, { spaces: 2 });
    }

    const status = (v) => (v ? "🟢 ON" : "🔴 OFF");

    const menu = `
╭────────〔 ANTI SYSTEM 〕
│
│ 1 → Anti Name     : ${status(data[threadID].name)}
│ 2 → Anti Avatar   : ${status(data[threadID].avatar)}
│ 3 → Anti Nickname : ${status(data[threadID].nickname)}
│ 4 → Anti Theme    : ${status(data[threadID].theme)}
│ 5 → Anti Emoji    : ${status(data[threadID].emoji)}
│ 6 → Anti Join     : ${status(data[threadID].join)}
│ 7 → Anti Out      : ${status(data[threadID].out)}
│ 🔒 lock → All toggle: ${status(data[threadID].lock)}
│
│ ℹ️ Admin-দের পরিবর্তন সবসময় allowed, শুধু non-admin-দের
│    পরিবর্তন revert হবে যতক্ষণ protection ON থাকবে।
│
╰───────────────
Reply with a number (1-7) or 'lock'`;

    message.reply(menu, (err, info) => {
      if (err) return;
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        author: senderID,
        threadID
      });
    });
  },

  onReply: async function ({ api, event, message }) {
    const { threadID, body } = event;
    const choice = body.trim().toLowerCase();
    let data = fs.readJsonSync(antiPath);
    if (!data[threadID]) return;
    if (!data[threadID].backup) data[threadID].backup = {};

    const keyMap = {
      "1": "name",
      "2": "avatar",
      "3": "nickname",
      "4": "theme",
      "5": "emoji",
      "6": "join",
      "7": "out"
    };

    // LOCK system
    if (choice === "lock") {
      const newLockState = !data[threadID].lock;
      data[threadID].lock = newLockState;
      for (const k of Object.values(keyMap)) data[threadID][k] = newLockState;

      // Backup if turning ON
      if (newLockState) {
        const threadInfo = await api.getThreadInfo(threadID).catch(() => null);
        if (threadInfo) {
          try {
            data[threadID].backup.name = threadInfo.threadName || "";
            if (threadInfo.imageSrc) {
              const img = await uploadImgbb(threadInfo.imageSrc).catch(() => null);
              data[threadID].backup.avatar = img?.image?.url || "";
            }
            data[threadID].backup.nickname = { ...threadInfo.nicknames };
            data[threadID].backup.theme = threadInfo.color || ""; // Use color if threadThemeID not available
            data[threadID].backup.emoji = threadInfo.emoji || "";
          } catch (e) {
            console.log("[Anti Lock] Backup error:", e);
          }
        }
      }

      fs.writeJsonSync(antiPath, data, { spaces: 2 });
      return message.reply(`🔒 Lock ${newLockState ? "ENABLED" : "DISABLED"} → All protections toggled`);
    }

    // Individual toggle
    if (!["1","2","3","4","5","6","7"].includes(choice)) {
      return message.reply("❌ Please reply with a valid number (1-7) or 'lock'");
    }

    const key = keyMap[choice];
    data[threadID][key] = !data[threadID][key];

    // Backup when turning ON individual
    if (data[threadID][key]) {
      const threadInfo = await api.getThreadInfo(threadID).catch(() => null);
      if (!threadInfo) return message.reply("⚠️ Cannot fetch group info");

      try {
        switch (key) {
          case "name":
            data[threadID].backup.name = threadInfo.threadName || "";
            break;
          case "avatar":
            if (threadInfo.imageSrc) {
              const img = await uploadImgbb(threadInfo.imageSrc).catch(() => null);
              data[threadID].backup.avatar = img?.image?.url || "";
            }
            break;
          case "nickname":
            data[threadID].backup.nickname = { ...threadInfo.nicknames };
            break;
          case "theme":
            data[threadID].backup.theme = threadInfo.color || "";
            break;
          case "emoji":
            data[threadID].backup.emoji = threadInfo.emoji || "";
            break;
        }
      } catch (e) { console.log("[Anti] Backup error:", e); }
    }

    fs.writeJsonSync(antiPath, data, { spaces: 2 });
    await message.reply(`✅ ${data[threadID][key] ? "Enabled" : "Disabled"} → ${key.toUpperCase()} protection`);
  },

  onEvent: async function ({ api, event }) {
    if (!event.logMessageType) return;
    const { threadID, logMessageType, logMessageData, author } = event;
    let data = fs.readJsonSync(antiPath);
    if (!data[threadID] || !data[threadID].backup) return;

    const config = data[threadID];
    const backup = config.backup;
    if (!backup.nickname) backup.nickname = {};
    const botID = api.getCurrentUserID();
    if (author === botID) return;

    try {
      // ── Admin bypass ──────────────────────────────────────────────
      // Group admins are always allowed to change things. We fetch the
      // thread info once here (reused below) both to check admin status
      // and, for admin changes, to refresh the backup to their new value
      // so a later non-admin change reverts to what the admin just set —
      // not to some stale snapshot from whenever lock was turned on.
      const threadInfo = await api.getThreadInfo(threadID).catch(() => null);
      const adminIDs = extractAdminIDs(threadInfo);
      const isAuthorAdmin = author && adminIDs.includes(String(author));

      if (isAuthorAdmin) {
        // Admin's own change — accept it and refresh the backup instead
        // of reverting.
        switch (logMessageType) {
          case "log:thread-name":
            backup.name = threadInfo?.threadName ?? backup.name;
            break;
          case "log:thread-image":
            if (threadInfo?.imageSrc) {
              const img = await uploadImgbb(threadInfo.imageSrc).catch(() => null);
              if (img?.image?.url) backup.avatar = img.image.url;
            }
            break;
          case "log:thread-color":
            backup.theme = threadInfo?.color ?? backup.theme;
            break;
          case "log:thread-icon":
            backup.emoji = threadInfo?.emoji ?? backup.emoji;
            break;
          case "log:user-nickname": {
            const changedUserID = logMessageData.participant_id;
            if (changedUserID && threadInfo?.nicknames) {
              backup.nickname[changedUserID] = threadInfo.nicknames[changedUserID] || "";
            }
            break;
          }
          // log:subscribe / log:unsubscribe by an admin: nothing to back up,
          // just let the join/leave stand (handled by falling through).
        }
        fs.writeJsonSync(antiPath, data, { spaces: 2 });
        return;
      }

      // ── Non-admin change — enforce protection ───────────────────────
      switch (logMessageType) {
        case "log:thread-name":
          if (config.name && backup.name !== undefined) await api.setTitle(backup.name, threadID);
          break;
        case "log:thread-image":
          if (config.avatar && backup.avatar) {
            const stream = await getStreamFromURL(backup.avatar).catch(() => null);
            if (stream) await api.changeGroupImage(stream, threadID);
          }
          break;
        case "log:thread-color":
          if (config.theme && backup.theme) await api.changeThreadColor(backup.theme, threadID);
          break;
        case "log:thread-icon":
          if (config.emoji && backup.emoji) await api.changeThreadEmoji(backup.emoji, threadID).catch(() => {});
          break;

        // ===== FIXED NICKNAME =====
        case "log:user-nickname": {
          if (!config.nickname) break;

          const changedUserID = logMessageData.participant_id;
          if (!changedUserID || changedUserID === botID) break;

          // Look up the RAW backup value first — only skip if we truly
          // never had a backup for this user (e.g. brand new member).
          const rawOriginalNick = backup.nickname[changedUserID];
          if (rawOriginalNick === undefined) break;
          const originalNick = rawOriginalNick || "";

          // Small delay to let FB apply the change
          await new Promise(r => setTimeout(r, 700));

          // Re-fetch fresh thread info for accuracy
          const freshThreadInfo = await api.getThreadInfo(threadID).catch(() => null);
          if (!freshThreadInfo) break;

          const currentNick = freshThreadInfo.nicknames[changedUserID] || "";

          if (currentNick !== originalNick) {
            console.log(`[AntiNickname] Reverting ${changedUserID} → "${originalNick}" (was: "${currentNick}")`);
            await api.changeNickname(originalNick, threadID, changedUserID).catch(err => {
              console.log("[AntiNickname] Revert failed:", err?.message || err);
            });
          }
          break;
        }

        case "log:subscribe":
          if (config.join && logMessageData.addedParticipants?.length) {
            await new Promise(r => setTimeout(r, 800));
            for (const user of logMessageData.addedParticipants) {
              await api.removeUserFromGroup(user.userFbId, threadID).catch(() => {});
            }
          }
          break;
        case "log:unsubscribe":
          if (config.out) {
            const leaverID = logMessageData.leftParticipantFbId;
            if (leaverID) {
              await new Promise(r => setTimeout(r, 1200));
              await api.addUserToGroup(leaverID, threadID).catch(() => {});
            }
          }
          break;
      }

      fs.writeJsonSync(antiPath, data, { spaces: 2 });
    } catch (err) {
      console.log("[Anti Error]", logMessageType, err.message);
    }
  }
};
