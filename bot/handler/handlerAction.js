const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");

// ── E2EE JID detection ───────────────────────────────────────────────────────
// A thread ID is an E2EE JID when it contains "@" (e.g. "12345:69@msgr" or
// "98765@group.facebook.com"). Regular Messenger thread IDs are pure numeric.
function isE2EEJID(id) {
  return typeof id === "string" && id.indexOf("@") !== -1;
}

module.exports = (
  api,
  threadModel,
  userModel,
  dashBoardModel,
  globalModel,
  usersData,
  threadsData,
  dashBoardData,
  globalData
) => {
  const handlerEvents = require(
    process.env.NODE_ENV == "development"
      ? "./handlerEvents.dev.js"
      : "./handlerEvents.js"
  )(
    api,
    threadModel,
    userModel,
    dashBoardModel,
    globalModel,
    usersData,
    threadsData,
    dashBoardData,
    globalData
  );

  // ═══════════ Anti-Spam / Flood Protection state ═══════════
  const floodTracker = {}; // { senderID: { timestamps: [], mutedUntil: 0 } }
  // prune idle entries so the tracker cannot grow forever on busy bots
  setInterval(() => {
    const now = Date.now();
    for (const id of Object.keys(floodTracker)) {
      const t = floodTracker[id];
      if (t.mutedUntil < now && (!t.timestamps.length || now - t.timestamps[t.timestamps.length - 1] > 60000))
        delete floodTracker[id];
    }
  }, 10 * 60 * 1000).unref();

  return async function (event) {
    // ── Anti-Inbox Protection ────────────────────────────────────────────────
    // antiInbox blocks unsolicited DMs. E2EE group messages (isGroup=true) and
    // normal groups are always allowed through. Only blocks when:
    //   • antiInbox is explicitly enabled in config, AND
    //   • The message is a plain DM (senderID == threadID — Messenger DM format),
    //     AND it is NOT an E2EE message (E2EE JIDs never equal a numeric senderID).
    if (global.GoatBot.config.antiInbox == true) {
      const tid = event.threadID;
      const sid = event.senderID || event.userID;
      // Block only plain numeric DMs (threadID === senderID), not E2EE JIDs.
      if (
        !isE2EEJID(tid) &&
        sid &&
        tid &&
        String(sid) === String(tid)
      ) return;
    }

    const message = createFuncMessage(api, event);

    // ══════════ Anti-Spam / Flood Protection ══════════
    if (["message", "message_reply", "e2ee_message", "message_unsend"].includes(event.type)) {
      const antiSpamCfg = global.GoatBot.config.antiSpam || {};
      const senderID = event.senderID || event.userID;
      const adminIDs = global.GoatBot.config.adminBot || [];
      const isAdmin = adminIDs.includes(senderID);

      if (
        antiSpamCfg.enable &&
        senderID &&
        !(antiSpamCfg.ignoreAdmin && isAdmin)
      ) {
        const now = Date.now();
        const timeFrameMs = (antiSpamCfg.timeFrameSeconds ?? 8) * 1000;
        const muteMs = (antiSpamCfg.muteSeconds ?? 20) * 1000;
        const maxMessages = antiSpamCfg.maxMessages ?? 6;

        if (!floodTracker[senderID])
          floodTracker[senderID] = { timestamps: [], mutedUntil: 0 };
        const tracker = floodTracker[senderID];

        if (tracker.mutedUntil > now) {
          return;
        }

        tracker.timestamps = tracker.timestamps.filter(t => now - t < timeFrameMs);
        tracker.timestamps.push(now);

        if (tracker.timestamps.length > maxMessages) {
          tracker.mutedUntil = now + muteMs;
          tracker.timestamps = [];
          if (antiSpamCfg.notifyOnMute) {
            try {
              await message.reply(
                `⚠️ তুমি অনেক দ্রুত মেসেজ পাঠাচ্ছো! ${Math.round(muteMs / 1000)} সেকেন্ডের জন্য বট তোমার মেসেজে সাড়া দিবে না।`
              );
            } catch (e) { /* ignore reply failure */ }
          }
          return;
        }
      }
    }

    // ══════════ Maintenance Mode ══════════
    const maintenanceCfg = global.GoatBot.config.maintenanceMode || {};
    if (maintenanceCfg.enable) {
      const senderID = event.senderID || event.userID;
      const adminIDs = global.GoatBot.config.adminBot || [];
      const isAdmin = adminIDs.includes(senderID);
      if (!(maintenanceCfg.allowAdminBot && isAdmin) && ["message", "message_reply", "e2ee_message", "message_unsend"].includes(event.type)) {
        try {
          await message.reply(maintenanceCfg.message || "🛠️ Bot is under maintenance.");
        } catch (e) { /* ignore reply failure */ }
        return;
      }
    }

    await handlerCheckDB(usersData, threadsData, event);

    const handlerChat = await handlerEvents(event, message);
    if (!handlerChat) return;

    const {
      onAnyEvent,
      onFirstChat,
      onStart,
      onChat,
      onReply,
      onEvent,
      handlerEvent,
      onReaction,
      typ,
      presence,
      read_receipt
    } = handlerChat;

    onAnyEvent();

    switch (event.type) {
      case "message":
      case "message_reply":
      case "e2ee_message": // E2EE encrypted messages (DM + Group)
      case "message_unsend":
        onFirstChat();
        onChat();
        onStart();
        onReply();
        break;

      case "event":
        handlerEvent();
        onEvent();
        break;

      case "message_reaction":
      case "e2ee_message_reaction": // E2EE group/DM reactions
        onReaction();

        // 💣 React-Unsend System
        try {
          const cfg = global.GoatBot.config.reactUnsend || {};
          const adminIDs = global.GoatBot.config.adminBot || [];
          const isAdmin = adminIDs.includes(event.userID || event.senderID);

          if (
            cfg.enable &&
            cfg.emojis?.includes(event.reaction) &&
            (!cfg.onlyAdmin || isAdmin)
          ) {
            await api.unsendMessage(event.messageID);
          }
        } catch (err) {
          console.error("❌ React-Unsend Error:", err);
        }

        break;

      case "typ":
        typ();
        break;

      case "presence":
        presence();
        break;

      case "read_receipt":
        read_receipt();
        break;

      default:
        break;
    }
  };
};
