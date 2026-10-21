const { getTime, log } = global.utils;

// ═══════════ Debug logging (cleaned up) ═══════════
// Previously every step of this file used console.log("[grouplogEvent] ...")
// directly, unconditionally - meaning every group message on every server
// this bot runs on printed several trace lines to stdout, even in normal
// production use. That's noisy and, since console.log output isn't wired
// into logger/log.js, it also never made it into logs/*.log for later
// review.
//
// Now: real problems (failed to load grouplog.js, failed to send the log
// message, unexpected exceptions) always go through the proper logger
// (log.warn / log.err), so they're visible AND persisted to logs/error.log
// or logs/bot.log. Step-by-step "why did this event get skipped" tracing
// only prints when explicitly turned on via config, so a live bot stays
// quiet by default.
const debugEnabled = !!(global.GoatBot?.config?.logEvents?.groupLogDebug);
function debug(...args) {
	if (debugEnabled)
		log.info("GROUP_LOG_DEBUG", args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" "));
}

// grouplog.js কমান্ড ফাইল থেকে অন/অফ স্ট্যাটাস চেক করার ফাংশনটা রিইউজ করা হচ্ছে
let isGrouplogOn = null;
try {
	isGrouplogOn = require("../cmds/grouplog.js").isGrouplogOn;
	debug("loaded OK, isGrouplogOn type:", typeof isGrouplogOn);
}
catch (e) {
	// This is a real, actionable problem (group logging is completely
	// disabled until fixed) so it always logs, regardless of debug mode.
	log.warn("GROUP_LOG", `Could not load ../cmds/grouplog.js - group event logging is disabled until this is fixed: ${e.message}`);
}

const line = "───────────────";

module.exports = {
	config: {
		name: "grouplogEvent",
		version: "1.2",
		author: "Hridoy",
		envConfig: {
			allow: true
		},
		category: "events"
	},

	onStart: async ({ event, api, threadsData, usersData }) => {
		try {
			debug("onStart called | type:", event.type, "| logMessageType:", event.logMessageType, "| threadID:", event.threadID);

			if (!isGrouplogOn) {
				debug("SKIP: isGrouplogOn function not loaded (grouplog.js missing from scripts/cmds/)");
				return;
			}

			const { threadID, logMessageType, logMessageData, author } = event;

			if (!threadID) {
				debug("SKIP: no threadID on this event");
				return;
			}

			// আগে থেকেই এটা call-join টাইপের ইভেন্ট কিনা চেক করে নেওয়া হচ্ছে,
			// কারণ এই ইভেন্টের logMessageType থাকে না — এটা event.type দিয়ে আসে
			const isCallJoin = event.type === "participant_joined_group_call";

			if (!logMessageType && !isCallJoin) {
				debug("SKIP: no logMessageType on this event (and not a call-join event)");
				return;
			}

			const threadIDStr = String(threadID);
			const status = isGrouplogOn(threadIDStr);
			debug(`threadID=${threadIDStr} grouplog status =`, status);

			if (!status) {
				debug("SKIP: grouplog is OFF for this thread. Turn it on with !grouplog on");
				return;
			}

			const authorName = author ? await usersData.getName(author).catch(() => "Unknown") : "Unknown";
			const time = getTime("HH:mm:ss, DD/MM/YYYY");

			let title = "";
			let body = "";

			if (isCallJoin) {
				const joinerID = event.author || (event.logMessageData && event.logMessageData.leftParticipantFbId) || author;
				const joinerName = joinerID ? await usersData.getName(joinerID).catch(() => "Unknown") : authorName;
				title = "📲 𝗖𝗔𝗟𝗟 𝗝𝗢𝗜𝗡𝗘𝗗";
				body = `👤 Joined: ${joinerName}`;
			}
			else {
				switch (logMessageType) {
					case "log:user-nickname": {
						const { participant_id, nickname } = logMessageData || {};
						if (!participant_id) { debug("SKIP: log:user-nickname missing participant_id", logMessageData); return; }
						const targetName = await usersData.getName(participant_id).catch(() => "Unknown");
						title = "🏷️ 𝗡𝗜𝗖𝗞𝗡𝗔𝗠𝗘 𝗖𝗛𝗔𝗡𝗚𝗘𝗗";
						body = `👤 Changed by: ${authorName}\n`
							+ `🎯 Target: ${targetName}\n`
							+ `📛 New nickname: ${nickname ? nickname : "( removed )"}`;
						break;
					}

					case "log:thread-name": {
						const { name } = logMessageData || {};
						title = "📝 𝗚𝗥𝗢𝗨𝗣 𝗡𝗔𝗠𝗘 𝗖𝗛𝗔𝗡𝗚𝗘𝗗";
						body = `👤 Changed by: ${authorName}\n`
							+ `📛 New name: ${name || "( unknown )"}`;
						break;
					}

					case "log:thread-image": {
						title = "🖼️ 𝗚𝗥𝗢𝗨𝗣 𝗜𝗠𝗔𝗚𝗘 𝗖𝗛𝗔𝗡𝗚𝗘𝗗";
						body = `👤 Changed by: ${authorName}`;
						break;
					}

					case "log:thread-icon": {
						const { thread_icon } = logMessageData || {};
						title = "🎨 𝗚𝗥𝗢𝗨𝗣 𝗘𝗠𝗢𝗝𝗜 𝗖𝗛𝗔𝗡𝗚𝗘𝗗";
						body = `👤 Changed by: ${authorName}\n`
							+ `😀 New emoji: ${thread_icon || "( unknown )"}`;
						break;
					}

					case "log:thread-color": {
						title = "🎨 𝗧𝗛𝗘𝗠𝗘 / 𝗔𝗣𝗣𝗘𝗔𝗥𝗔𝗡𝗖𝗘 𝗨𝗣𝗗𝗔𝗧𝗘𝗗";
						body = `👤 Changed by: ${authorName}`;
						break;
					}

					case "log:thread-admins": {
						const { TARGET_ID, ADMIN_EVENT } = logMessageData || {};
						const targetName = TARGET_ID ? await usersData.getName(TARGET_ID).catch(() => "Unknown") : "Unknown";
						const added = ADMIN_EVENT === "add_admin";
						title = "🛡️ 𝗔𝗗𝗠𝗜𝗡 𝗨𝗣𝗗𝗔𝗧𝗘";
						body = `👤 Changed by: ${authorName}\n`
							+ `🎯 Target: ${targetName}\n`
							+ `${added ? "➕ Made admin" : "➖ Removed from admin"}`;
						break;
					}

					case "log:subscribe": {
						const { addedParticipants } = logMessageData || {};
						if (!addedParticipants || addedParticipants.length === 0) { debug("SKIP: log:subscribe missing addedParticipants"); return; }
						const names = addedParticipants.map(p => p.fullName || p.userFbId).join(", ");
						title = "➕ 𝗠𝗘𝗠𝗕𝗘𝗥 𝗔𝗗𝗗𝗘𝗗";
						body = `👤 Added by: ${authorName}\n`
							+ `🙋 New member(s): ${names}`;
						break;
					}

					case "log:unsubscribe": {
						const { leftParticipantFbId } = logMessageData || {};
						if (!leftParticipantFbId) { debug("SKIP: log:unsubscribe missing leftParticipantFbId"); return; }
						const leftName = await usersData.getName(leftParticipantFbId).catch(() => "Unknown");
						const isKicked = author && leftParticipantFbId != author;
						title = "➖ 𝗠𝗘𝗠𝗕𝗘𝗥 𝗥𝗘𝗠𝗢𝗩𝗘𝗗";
						body = isKicked
							? `👤 Removed by: ${authorName}\n🚪 Removed: ${leftName}`
							: `🚪 Left the group: ${leftName}`;
						break;
					}

					case "log:thread-call": {
						const callEvent = (logMessageData && (logMessageData.event || logMessageData.call_type || "")) + "";
						const body_ = event.logMessageBody || "";
						let icon = "📞";
						let action = "Call event";

						if (/started|start/i.test(callEvent) || /started a call|bắt đầu/i.test(body_)) {
							icon = "📞";
							action = "Call started";
						}
						else if (/joined|join/i.test(callEvent) || /joined the call|đã tham gia/i.test(body_)) {
							icon = "📲";
							action = "Call joined";
						}
						else if (/ended|end|missed|not answered/i.test(callEvent) || /call ended|kết thúc/i.test(body_)) {
							icon = "📴";
							action = "Call ended";
						}

						title = `${icon} ${action.toUpperCase()}`;
						body = `👤 By: ${authorName}`;
						break;
					}

					default:
						debug("SKIP: unhandled logMessageType =", logMessageType);
						return;
				}
			}

			if (!title) {
				log.warn("GROUP_LOG", "title empty after switch - this should not happen, please report this as a bug");
				return;
			}

			const msg = `╭${line}╮\n`
				+ `   ${title}\n`
				+ `╰${line}╯\n`
				+ `${body}\n\n`
				+ `🕒 ${time}`;

			debug("SENDING message to thread", threadIDStr);

			const result = await api.sendMessage(msg, threadID);
			debug("SEND SUCCESS, messageID:", result?.messageID);
			return result;
		}
		catch (e) {
			log.err("GROUP_LOG", `FATAL ERROR in grouplogEvent onStart: ${e.message}`, e);
		}
	}
};
