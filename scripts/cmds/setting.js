/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         SETTING — Advanced Bot Settings Manager              ║
 * ║         Version : 9.0.0                                      ║
 * ║         Author  : EryXenX + Hridoy                          ║
 * ║                                                              ║
 * ║  CATEGORIES:                                                 ║
 * ║   1. Account & Security                                      ║
 * ║   2. Bot Behavior (prefix, lang, timezone, toggles)          ║
 * ║   3. No Prefix (Global / Admin-only mode)  ◄ ADVANCED        ║
 * ║   4. Admin Manage                                            ║
 * ║   5. Whitelist Manage                                        ║
 * ║   6. Access & Spam Control                                   ║
 * ║   7. FCA Options                                             ║
 * ║   8. FCA Features (Active, AutoSeen, Story React, Typing)    ║
 * ║   9. React Unsend                                            ║
 * ║  10. Nickname                                                ║
 * ║  11. Database                                                ║
 * ║  12. Dashboard & Uptime                                      ║
 * ║  13. MQTT / Connection                                       ║
 * ║  14. Notifications (Gmail, Telegram, Discord)                ║
 * ║  15. Logging & Debug                                         ║
 * ║  16. E2EE Settings                                           ║
 * ║  17. Two-ID Mode                                             ║
 * ║  18. Credentials                                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const fs   = require("fs");
const path = require("path");

// ── globalData keys ──────────────────────────────────────────────
const KEY_ACTIVE = "botActiveStatus";
const KEY_SEEN   = "autoSeen";
const KEY_STORY  = "storyReaction";

const VALID_STORY_REACTIONS = {
	like: "👍", "👍": "👍",
	love: "❤️", "❤️": "❤️", heart: "❤️",
	haha: "😆", "😆": "😆",
	wow:  "😮", "😮": "😮",
	sad:  "😢", "😢": "😢",
	angry:"😡", "😡": "😡",
	hug:  "🤗", "🤗": "🤗",
};

// ── UI helpers ───────────────────────────────────────────────────
function status(val) {
	return val ? "ON ✦" : "OFF ◌";
}

function masked(val) {
	if (val === undefined || val === null || val === "" || val === " ") return "Not set ✕";
	return "Set ✦ (" + String(val).length + " chars)";
}

function box(title, lines, footer) {
	const divider = "━━━━━━━━━━━━━━━━━";
	return [`⚙️ ${title}`, divider, ...lines, divider, `› ${footer}`].join("\n");
}

async function ensureKey(globalData, key, defaultData) {
	if (!globalData.existsSync(key))
		await globalData.create(key, { data: defaultData });
}

// ── Categories list ───────────────────────────────────────────────
const CATEGORIES = [
	{ num: 1,  label: "🔐 Account & Security" },
	{ num: 2,  label: "🤖 Bot Behavior" },
	{ num: 3,  label: "🚫 No Prefix (Advanced)" },
	{ num: 4,  label: "👑 Admin Manage" },
	{ num: 5,  label: "🔒 Whitelist Manage" },
	{ num: 6,  label: "🛡️ Access & Spam Control" },
	{ num: 7,  label: "🧩 FCA Options" },
	{ num: 8,  label: "✨ FCA Features" },
	{ num: 9,  label: "💬 React Unsend" },
	{ num: 10, label: "🏷️ Nickname" },
	{ num: 11, label: "🗄️ Database" },
	{ num: 12, label: "📊 Dashboard & Uptime" },
	{ num: 13, label: "📡 MQTT / Connection" },
	{ num: 14, label: "🔔 Notifications" },
	{ num: 15, label: "📝 Logging & Debug" },
	{ num: 16, label: "🔐 E2EE Settings" },
	{ num: 17, label: "👥 Two-ID Mode" },
	{ num: 18, label: "🔑 Credentials" },
];

function renderMainMenu() {
	const items = CATEGORIES.map(c => `${c.num < 10 ? " " : ""}${c.num}. ${c.label}`);
	return box("Bot Settings — Main Menu", items, `Reply 1–${CATEGORIES.length} · 0 = back`);
}

// ════════════════════════════════════════════════════════════════
module.exports = {
	config: {
		name: "setting",
		aliases: ["settings", "config"],
		version: "9.0.2",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		shortDescription: "Advanced bot settings manager",
		longDescription: "Full control over every bot setting — live, no restart needed for most options.",
		category: "System",
		guide: "{prefix}setting",
	},

	// ─────────────────────────────────────────────────────────────────
	onStart: async function ({ event, message }) {
		const sent = await message.reply(renderMainMenu());
		global.GoatBot.onReply.set(sent.messageID, {
			commandName: "setting",
			messageID: sent.messageID,
			author: event.senderID,
			state: "main",
		});
	},

	// ─────────────────────────────────────────────────────────────────
	onReply: async function ({ api, event, Reply, message, globalData, threadsData }) {
		const { author, state } = Reply;
		if (event.senderID !== author) return;

		// Always use live in-memory config so changes take effect immediately
		const config     = global.GoatBot.config;
		const configPath = path.join(process.cwd(), "config.json");
		const input      = event.body.trim();
		const num        = parseInt(input);

		function saveConfig() {
			fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
		}

		async function sendAndListen(text, newState, extra = {}) {
			const sent = await message.reply(text);
			global.GoatBot.onReply.set(sent.messageID, {
				commandName: "setting",
				messageID: sent.messageID,
				author,
				state: newState,
				...extra,
			});
		}

		async function backToMain() {
			return await sendAndListen(renderMainMenu(), "main");
		}

		// ── 0 always goes back ──
		if (num === 0 && state !== "main") return backToMain();

		// ══════════════════════════════════════════════════════════════
		//  MAIN MENU
		// ══════════════════════════════════════════════════════════════
		if (state === "main") {
			if (num < 1 || num > CATEGORIES.length)
				return message.reply(`𝗫 Invalid. Reply 1–${CATEGORIES.length}.`);

			// ── 1. Account & Security ──────────────────────────────────
			if (num === 1) {
				const fb = config.facebookAccount || {};
				return await sendAndListen(box("Account & Security", [
					`1. Email      — ${fb.email || "Not set ✕"}`,
					`2. Password   — ${masked(fb.password)}`,
					`3. 2FA Secret — ${masked(fb["2FASecret"])}`,
					`4. i_user     — ${masked(fb.i_user)}`,
					`5. Proxy      — ${fb.proxy || "Not set ✕"}`,
					`6. User Agent — ${fb.userAgent ? "Set ✦" : "Not set ✕"}`,
					`7. Cookie Refresh Interval — ${fb.intervalGetNewCookie ?? "Not set"} min`,
				], "Reply 1-7 · ⚠️ restart needed"), "fbAccount");
			}

			// ── 2. Bot Behavior ────────────────────────────────────────
			if (num === 2) {
				return await sendAndListen(box("Bot Behavior", [
					`1.  Prefix           — ${config.prefix || "/"}`,
					`2.  Language         — ${config.language || "en"}`,
					`3.  Time Zone        — ${config.timeZone || "Not set"}`,
					`4.  Anti Inbox       — ${status(config.antiInbox)}`,
					`5.  Admin Only       — ${status(config.adminOnly?.enable)}`,
					`6.  Cooldown Bypass Admin — ${status(config.cooldownBypassAdmin)}`,
					`7.  Auto Refresh Fbstate  — ${status(config.autoRefreshFbstate)}`,
					`8.  Auto Relogin on Acct  — ${status(config.autoReloginWhenChangeAccount)}`,
					`9.  Auto Restart on MQTT  — ${status(config.autoRestartWhenListenMqttError)}`,
					`10. Auto Restart Time     — ${config.autoRestart?.time ?? "Not set"}`,
					`11. Reaction Debug        — ${status(config.reactionDebug)}`,
				], "Reply 1-11"), "botBehavior");
			}

			// ── 3. No Prefix (Advanced) ─────────────────────────────────
			if (num === 3) {
				const np = config.noPrefix || {};
				// mode: "admin" = only adminBot, "all" = everyone
				const mode = np.mode || (np.enable ? "admin" : "off");
				return await sendAndListen(box("No Prefix — Advanced", [
					`Current Mode: ${mode === "all" ? "🌍 ALL USERS" : mode === "admin" ? "👑 ADMIN ONLY" : "❌ DISABLED"}`,
					"",
					"1. OFF   — prefix required for everyone",
					"2. ADMIN — only adminBot can use without prefix",
					"3. ALL   — everyone can use without prefix",
					"",
					"⚠️ Mode 3 lets ALL users run commands",
					"   without typing the prefix.",
				], "Reply 1, 2, or 3 to set mode"), "noPrefixMode");
			}

			// ── 4. Admin Manage ──────────────────────────────────────────
			if (num === 4) {
				const admins = config.adminBot || [];
				return await sendAndListen(box("Admin Manage", [
					`Admins: ${admins.length}`,
					"",
					"1. Add Admin",
					"2. Remove Admin",
					"3. List Admins",
				], "Reply 1-3"), "adminManage");
			}

			// ── 5. Whitelist Manage ──────────────────────────────────────
			if (num === 5) {
				return await sendAndListen(box("Whitelist Manage", [
					`1. Thread Whitelist — ${status(config.whiteListModeThread?.enable)}`,
					"2. Add Thread",
					"3. Remove Thread",
					`4. User Whitelist   — ${status(config.whiteListMode?.enable)}`,
					"5. Add User",
					"6. Remove User",
				], "Reply 1-6"), "whitelist");
			}

			// ── 6. Access & Spam Control ─────────────────────────────────
			if (num === 6) {
				const as = config.antiSpam || {};
				const mm = config.maintenanceMode || {};
				const cp = config.commandPerformance || {};
				const sec = config.security || {};
				return await sendAndListen(box("Access & Spam Control", [
					`1.  Anti Spam           — ${status(as.enable)}`,
					`2.  Spam Max Msgs       — ${as.maxMessages ?? 8}`,
					`3.  Spam Time Frame     — ${as.timeFrameSeconds ?? 10}s`,
					`4.  Spam Mute Duration  — ${as.muteSeconds ?? 20}s`,
					`5.  Spam Ignore Admin   — ${status(as.ignoreAdmin)}`,
					`6.  Spam Notify Mute    — ${status(as.notifyOnMute)}`,
					`7.  Maintenance Mode    — ${status(mm.enable)}`,
					`8.  Maintenance Msg     — ${mm.message ? "Set ✦" : "Not set ✕"}`,
					`9.  Maint. Allow Admin  — ${status(mm.allowAdminBot)}`,
					`10. Cmd Performance Log — ${status(cp.enable)}`,
					`11. Slow Cmd Threshold  — ${cp.slowCommandThresholdMs ?? 4000}ms`,
					`12. Expose Error Details— ${status(sec.exposeErrorDetailsInChat)}`,
				], "Reply 1-12"), "accessControl");
			}

			// ── 7. FCA Options ──────────────────────────────────────────
			if (num === 7) {
				const o = config.optionsFca || {};
				return await sendAndListen(box("FCA Options", [
					`1. Force Login        — ${status(o.forceLogin)}`,
					`2. Listen Events      — ${status(o.listenEvents)}`,
					`3. Update Presence    — ${status(o.updatePresence)}`,
					`4. Listen Typing      — ${status(o.listenTyping)}`,
					`5. Self Listen        — ${status(o.selfListen)}`,
					`6. Self Listen Event  — ${status(o.selfListenEvent)}`,
					`7. Auto Mark Delivery — ${status(o.autoMarkDelivery)}`,
					`8. Auto Reconnect     — ${status(o.autoReconnect)}`,
				], "Reply 1-8 to toggle"), "fcaOptions");
			}

			// ── 8. FCA Features ─────────────────────────────────────────
			if (num === 8) {
				await ensureKey(globalData, KEY_ACTIVE, { enabled: false });
				await ensureKey(globalData, KEY_SEEN,   { globalEnabled: false, threads: {} });
				await ensureKey(globalData, KEY_STORY,  { enabled: false, emoji: "❤️" });
				const activeData = await globalData.get(KEY_ACTIVE, "data", { enabled: false });
				const seenData   = await globalData.get(KEY_SEEN,   "data", { globalEnabled: false, threads: {} });
				const storyData  = await globalData.get(KEY_STORY,  "data", { enabled: false, emoji: "❤️" });
				const threadSeen = seenData.threads?.[event.threadID] || false;
				return await sendAndListen(box("FCA Features", [
					`1. Active Status         — ${status(activeData.enabled)}`,
					`2. AutoSeen Global       — ${status(seenData.globalEnabled)}`,
					`3. AutoSeen This Thread  — ${status(threadSeen)}`,
					`4. Story Auto-React      — ${status(storyData.enabled)}`,
					`5. Story React Emoji     — ${storyData.emoji}`,
					`6. Typing Indicator      — ${status(config.enableTypingIndicator)}`,
					`7. Typing Duration       — ${config.typingDuration ?? 2000}ms`,
				], "Reply 1-7"), "fcaFeatures", { threadID: event.threadID });
			}

			// ── 9. React Unsend ──────────────────────────────────────────
			if (num === 9) {
				return await sendAndListen(box("React Unsend", [
					`1. Toggle    — ${status(config.reactUnsend?.enable)}`,
					`2. Only Admin— ${status(config.reactUnsend?.onlyAdmin)}`,
					"3. Add Emoji",
					"4. Remove Emoji",
					"5. List Emojis",
				], "Reply 1-5"), "reactUnsend");
			}

			// ── 10. Nickname ─────────────────────────────────────────────
			if (num === 10) {
				return await sendAndListen(box("Nickname", [
					`Current: ${config.nickNameBot || "Not set"}`,
					"",
					"1. Set Nickname (this group)",
					"2. Set Nickname (all groups)",
					"3. Reset Nickname",
				], "Reply 1-3"), "nickname");
			}

			// ── 11. Database ─────────────────────────────────────────────
			if (num === 11) {
				const db = config.database || {};
				return await sendAndListen(box("Database", [
					`1. Type (needs restart) — ${db.type || "Not set"}`,
					`2. MongoDB URI          — ${masked(db.uriMongodb)}`,
					`3. Auto Sync on Start   — ${status(db.autoSyncWhenStart)}`,
					`4. Auto Refresh Thread  — ${status(db.autoRefreshThreadInfoFirstTime)}`,
				], "Reply 1-4"), "database");
			}

			// ── 12. Dashboard & Uptime ───────────────────────────────────
			if (num === 12) {
				const dash = config.dashBoard || {};
				const up   = config.serverUptime || {};
				const auto = config.autoUptime || {};
				return await sendAndListen(box("Dashboard & Uptime", [
					`1.  Dashboard Enable        — ${status(dash.enable)}`,
					`2.  Dashboard Port          — ${dash.port ?? "Not set"}`,
					`3.  Verify Code Expiry (ms) — ${dash.expireVerifyCode ?? "Not set"}`,
					`4.  Server Uptime Enable    — ${status(up.enable)}`,
					`5.  Server Uptime Port      — ${up.port ?? "Not set"}`,
					`6.  Socket Enable           — ${status(up.socket?.enable)}`,
					`7.  Socket Channel Name     — ${up.socket?.channelName || "Not set"}`,
					`8.  Auto Uptime Enable      — ${status(auto.enable)}`,
					`9.  Auto Uptime Interval(s) — ${auto.timeInterval ?? "Not set"}`,
					`10. Auto Uptime URL         — ${auto.url || "Not set"}`,
				], "Reply 1-10"), "dashboardUptime");
			}

			// ── 13. MQTT / Connection ────────────────────────────────────
			if (num === 13) {
				const r = config.restartListenMqtt || {};
				return await sendAndListen(box("MQTT / Connection", [
					`1. Restart Listen MQTT  — ${status(r.enable)}`,
					`2. Restart Interval(ms) — ${r.timeRestart ?? "Not set"}`,
					`3. Delay After Stop(ms) — ${r.delayAfterStopListening ?? "Not set"}`,
					`4. Log Notification     — ${status(r.logNoti)}`,
					"5. Restart Listen Now",
				], "Reply 1-5"), "mqttConn");
			}

			// ── 14. Notifications ────────────────────────────────────────
			if (num === 14) {
				const gm = config.notiWhenListenMqttError?.gmail || {};
				const tg = config.notiWhenListenMqttError?.telegram || {};
				const dc = config.notiWhenListenMqttError?.discordHook || {};
				return await sendAndListen(box("Notifications (MQTT Error)", [
					"─ Gmail ─",
					`1. Gmail Enable      — ${status(gm.enable)}`,
					`2. Gmail Notify Email— ${gm.emailGetNoti || "Not set"}`,
					"─ Telegram ─",
					`3. Telegram Enable   — ${status(tg.enable)}`,
					`4. Telegram Bot Token— ${masked(tg.botToken)}`,
					`5. Telegram Chat ID  — ${tg.chatId || "Not set"}`,
					"─ Discord ─",
					`6. Discord Enable    — ${status(dc.enable)}`,
					`7. Discord Webhook   — ${masked(dc.webhookUrl)}`,
				], "Reply 1-7"), "notifications");
			}

			// ── 15. Logging & Debug ──────────────────────────────────────
			if (num === 15) {
				const le = config.logEvents || {};
				const hn = config.hideNotiMessage || {};
				return await sendAndListen(box("Logging & Debug", [
					"─ Log Events ─",
					`1.  Disable All Events  — ${status(le.disableAll)}`,
					`2.  Log Message         — ${status(le.message)}`,
					`3.  Log Reaction        — ${status(le.message_reaction)}`,
					`4.  Log Unsend          — ${status(le.message_unsend)}`,
					`5.  Log Reply           — ${status(le.message_reply)}`,
					`6.  Log Event           — ${status(le.event)}`,
					`7.  Log Read Receipt    — ${status(le.read_receipt)}`,
					`8.  Log Typing          — ${status(le.typ)}`,
					`9.  Log Presence        — ${status(le.presence)}`,
					`10. Group Log Debug     — ${status(le.groupLogDebug)}`,
					"─ Hide Notifications ─",
					`11. Hide Cmd Not Found  — ${status(hn.commandNotFound)}`,
					`12. Hide Admin Only     — ${status(hn.adminOnly)}`,
					`13. Hide Thread Banned  — ${status(hn.threadBanned)}`,
					`14. Hide User Banned    — ${status(hn.userBanned)}`,
					`15. Hide Need Role      — ${status(hn.needRoleToUseCmd)}`,
					`16. Hide Need Role Reply— ${status(hn.needRoleToUseCmdOnReply)}`,
					`17. Hide Need Role React— ${status(hn.needRoleToUseCmdOnReaction)}`,
				], "Reply 1-17 to toggle"), "loggingDebug");
			}

			// ── 16. E2EE Settings ────────────────────────────────────────
			if (num === 16) {
				const e = config.e2ee || {};
				return await sendAndListen(box("E2EE Settings", [
					`1. Enable E2EE      — ${status(e.enable)}`,
					`2. Memory Only      — ${status(e.memoryOnly)}`,
					`3. Auto Reconnect   — ${status(e.autoReconnect)}`,
					`4. Log Level        — ${e.logLevel || "none"}`,
					`5. Save Type        — ${e.saveType || "path"}`,
					`6. Device Path      — ${e.devicePath || "Not set"}`,
					"",
					"⚠️ E2EE changes need a bot restart.",
					"   React to confirm toggle (item 1).",
				], "Reply 1-6"), "e2eeSettings");
			}

			// ── 17. Two-ID Mode ──────────────────────────────────────────
			if (num === 17) {
				const ti = config.twoIdMode || {};
				return await sendAndListen(box("Two-ID Mode", [
					`1. Enable                   — ${status(ti.enable)}`,
					`2. Secondary Account Path   — ${ti.secondaryAccountPath || "account2.txt"}`,
					`3. Switch After Fail Count  — ${ti.switchAfterFailedAttempts ?? 2}`,
					"",
					"ℹ️  Put 2nd account cookies in account2.txt",
					"   Bot auto-switches if primary fails.",
				], "Reply 1-3 · ⚠️ restart needed"), "twoIdMode");
			}

			// ── 18. Credentials ──────────────────────────────────────────
			if (num === 18) {
				const g = config.credentials?.gmailAccount || {};
				const r = config.credentials?.gRecaptcha || {};
				return await sendAndListen(box("Credentials", [
					`1. Gmail Email        — ${g.email || "Not set ✕"}`,
					`2. Gmail Client ID    — ${masked(g.clientId)}`,
					`3. Gmail Client Secret— ${masked(g.clientSecret)}`,
					`4. Gmail Refresh Token— ${masked(g.refreshToken)}`,
					`5. Gmail API Key      — ${masked(g.apiKey)}`,
					`6. reCAPTCHA Site Key — ${masked(r.siteKey)}`,
					`7. reCAPTCHA Secret   — ${masked(r.secretKey)}`,
				], "Reply 1-7"), "credentials");
			}
		}

		// ══════════════════════════════════════════════════════════════
		//  1. ACCOUNT & SECURITY
		// ══════════════════════════════════════════════════════════════
		if (state === "fbAccount") {
			const fields = [
				["email",                     "Email",                    "text"],
				["password",                  "Password",                 "text"],
				["2FASecret",                 "2FA Secret",               "text"],
				["i_user",                    "i_user",                   "text"],
				["proxy",                     "Proxy",                    "text"],
				["userAgent",                 "User Agent",               "text"],
				["intervalGetNewCookie",      "Cookie Refresh Interval (min)", "number"],
			];
			const field = fields[num - 1];
			if (!field) return message.reply("𝗫 Invalid selection.");
			return await sendAndListen(`› Reply with new value for ${field[1]}:`, "fbAccountSet", { fieldKey: field[0], fieldType: field[2] });
		}
		if (state === "fbAccountSet") {
			const { fieldKey, fieldType } = Reply;
			let value = input;
			if (fieldType === "number") {
				if (isNaN(num)) return message.reply("𝗫 Invalid number.");
				value = num;
			}
			config.facebookAccount = config.facebookAccount || {};
			config.facebookAccount[fieldKey] = value;
			saveConfig();
			return message.reply("✦ Updated. (Restart the bot for this to take effect.)");
		}

		// ══════════════════════════════════════════════════════════════
		//  2. BOT BEHAVIOR
		// ══════════════════════════════════════════════════════════════
		if (state === "botBehavior") {
			if (num === 1) return await sendAndListen("› Reply with new prefix:", "prefixSet");
			if (num === 2) return await sendAndListen("› Reply with language code (e.g. en, bn):", "languageSet");
			if (num === 3) return await sendAndListen("› Reply with time zone (e.g. Asia/Dhaka):", "timeZoneSet");
			if (num === 4)  { config.antiInbox = !config.antiInbox; saveConfig(); return message.reply(`✦ Anti Inbox — ${status(config.antiInbox)}`); }
			if (num === 5)  { config.adminOnly = config.adminOnly || {}; config.adminOnly.enable = !config.adminOnly.enable; saveConfig(); return message.reply(`✦ Admin Only — ${status(config.adminOnly.enable)}`); }
			if (num === 6)  { config.cooldownBypassAdmin = !config.cooldownBypassAdmin; saveConfig(); return message.reply(`✦ Cooldown Bypass Admin — ${status(config.cooldownBypassAdmin)}`); }
			if (num === 7)  { config.autoRefreshFbstate = !config.autoRefreshFbstate; saveConfig(); return message.reply(`✦ Auto Refresh Fbstate — ${status(config.autoRefreshFbstate)}`); }
			if (num === 8)  { config.autoReloginWhenChangeAccount = !config.autoReloginWhenChangeAccount; saveConfig(); return message.reply(`✦ Auto Relogin — ${status(config.autoReloginWhenChangeAccount)}`); }
			if (num === 9)  { config.autoRestartWhenListenMqttError = !config.autoRestartWhenListenMqttError; saveConfig(); return message.reply(`✦ Auto Restart on MQTT Error — ${status(config.autoRestartWhenListenMqttError)}`); }
			if (num === 10) return await sendAndListen("› Reply with auto restart time (cron or ms, e.g. '0 4 * * *' or 3600000 or 'null' to disable):", "autoRestartSet");
			if (num === 11) { config.reactionDebug = !config.reactionDebug; saveConfig(); try { api.setOptions({ reactionDebug: config.reactionDebug }); } catch (e) {} return message.reply(`✦ Reaction Debug — ${status(config.reactionDebug)}`); }
			return message.reply("𝗫 Invalid selection.");
		}
		if (state === "prefixSet") { if (!input) return message.reply("𝗫 Empty."); config.prefix = input; saveConfig(); return message.reply(`✦ Prefix → ${input}`); }
		if (state === "languageSet") { if (!input) return message.reply("𝗫 Empty."); config.language = input; saveConfig(); return message.reply(`✦ Language → ${input}`); }
		if (state === "timeZoneSet") { if (!input) return message.reply("𝗫 Empty."); config.timeZone = input; saveConfig(); return message.reply(`✦ Time Zone → ${input}`); }
		if (state === "autoRestartSet") {
			config.autoRestart = config.autoRestart || {};
			config.autoRestart.time = input === "null" ? null : (isNaN(num) ? input : num);
			saveConfig();
			return message.reply(`✦ Auto Restart time → ${config.autoRestart.time ?? "disabled"}`);
		}

		// ══════════════════════════════════════════════════════════════
		//  3. NO PREFIX — ADVANCED GLOBAL MODE SYSTEM
		// ══════════════════════════════════════════════════════════════
		if (state === "noPrefixMode") {
			config.noPrefix = config.noPrefix || {};
			if (num === 1) {
				// OFF — prefix required for everyone
				config.noPrefix.enable = false;
				config.noPrefix.mode   = "off";
				saveConfig();
				return message.reply(
					"✦ No Prefix → ❌ DISABLED\n" +
					"› Prefix is required for all users."
				);
			}
			if (num === 2) {
				// ADMIN ONLY — only adminBot can use without prefix
				config.noPrefix.enable = true;
				config.noPrefix.mode   = "admin";
				saveConfig();
				return message.reply(
					"✦ No Prefix → 👑 ADMIN ONLY\n" +
					"› Only adminBot IDs can run commands without prefix."
				);
			}
			if (num === 3) {
				// ALL — everyone can use without prefix
				config.noPrefix.enable = true;
				config.noPrefix.mode   = "all";
				saveConfig();
				return message.reply(
					"✦ No Prefix → 🌍 ALL USERS\n" +
					"› Everyone can run commands without prefix.\n" +
					"⚠️ Note: handlerEvents.js must support mode='all'.\n" +
					"   See patch instructions if this doesn't work."
				);
			}
			return message.reply("𝗫 Reply 1, 2, or 3.");
		}

		// ══════════════════════════════════════════════════════════════
		//  4. ADMIN MANAGE
		// ══════════════════════════════════════════════════════════════
		if (state === "adminManage") {
			if (num === 1) return await sendAndListen("› Reply with UID or tag user to add as admin:", "adminAdd");
			if (num === 2) {
				const admins = config.adminBot || [];
				if (!admins.length) return message.reply("𝗫 No admins.");
				return await sendAndListen(box("Remove Admin", admins.map((id, i) => `${i + 1}. ${id}`), "Reply number to remove"), "adminRemoveSelect");
			}
			if (num === 3) {
				const admins = config.adminBot || [];
				return message.reply(admins.length ? `👑 Admins:\n${admins.map((id, i) => `${i + 1}. ${id}`).join("\n")}` : "𝗫 No admins.");
			}
			return message.reply("𝗫 Invalid.");
		}
		if (state === "adminAdd") {
			let uid = input;
			if (event.mentions && Object.keys(event.mentions).length > 0) uid = Object.keys(event.mentions)[0];
			if (!uid || isNaN(uid)) return message.reply("𝗫 Invalid UID.");
			config.adminBot = config.adminBot || [];
			if (config.adminBot.includes(uid)) return message.reply("𝗫 Already an admin.");
			config.adminBot.push(uid);
			saveConfig();
			return message.reply(`✦ Added ${uid} as admin.`);
		}
		if (state === "adminRemoveSelect") {
			const admins = config.adminBot || [];
			const idx = num - 1;
			if (isNaN(num) || !admins[idx]) return message.reply("𝗫 Invalid selection.");
			const removed = admins.splice(idx, 1)[0];
			config.adminBot = admins;
			saveConfig();
			return message.reply(`✦ Removed ${removed} from admins.`);
		}

		// ══════════════════════════════════════════════════════════════
		//  5. WHITELIST MANAGE
		// ══════════════════════════════════════════════════════════════
		if (state === "whitelist") {
			if (num === 1) { config.whiteListModeThread = config.whiteListModeThread || {}; config.whiteListModeThread.enable = !config.whiteListModeThread.enable; saveConfig(); return message.reply(`✦ Thread Whitelist — ${status(config.whiteListModeThread.enable)}`); }
			if (num === 2) return await sendAndListen("› Reply with Thread ID to add:", "wlAddThread");
			if (num === 3) {
				const threads = config.whiteListModeThread?.whiteListThreadIds || [];
				if (!threads.length) return message.reply("𝗫 No threads.");
				return await sendAndListen(box("Remove Thread", threads.map((id, i) => `${i + 1}. ${id}`), "Reply number"), "wlRemoveSelect");
			}
			if (num === 4) { config.whiteListMode = config.whiteListMode || {}; config.whiteListMode.enable = !config.whiteListMode.enable; saveConfig(); return message.reply(`✦ User Whitelist — ${status(config.whiteListMode.enable)}`); }
			if (num === 5) return await sendAndListen("› Reply with UID or tag user to whitelist:", "wlAddUser");
			if (num === 6) {
				const users = config.whiteListMode?.whiteListIds || [];
				if (!users.length) return message.reply("𝗫 No users.");
				return await sendAndListen(box("Remove User", users.map((id, i) => `${i + 1}. ${id}`), "Reply number"), "wlRemoveUserSelect");
			}
			return message.reply("𝗫 Invalid.");
		}
		if (state === "wlAddThread") { const tid = input; if (!tid) return message.reply("𝗫 Invalid."); config.whiteListModeThread = config.whiteListModeThread || {}; config.whiteListModeThread.whiteListThreadIds = config.whiteListModeThread.whiteListThreadIds || []; if (!config.whiteListModeThread.whiteListThreadIds.includes(tid)) config.whiteListModeThread.whiteListThreadIds.push(tid); saveConfig(); return message.reply(`✦ Thread ${tid} added.`); }
		if (state === "wlRemoveSelect") { const threads = config.whiteListModeThread?.whiteListThreadIds || []; const idx = num - 1; if (isNaN(num) || !threads[idx]) return message.reply("𝗫 Invalid."); const removed = threads.splice(idx, 1)[0]; config.whiteListModeThread.whiteListThreadIds = threads; saveConfig(); return message.reply(`✦ Thread ${removed} removed.`); }
		if (state === "wlAddUser") { let uid = input; if (event.mentions && Object.keys(event.mentions).length > 0) uid = Object.keys(event.mentions)[0]; if (!uid || isNaN(uid)) return message.reply("𝗫 Invalid UID."); config.whiteListMode = config.whiteListMode || {}; config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds || []; if (!config.whiteListMode.whiteListIds.includes(uid)) config.whiteListMode.whiteListIds.push(uid); saveConfig(); return message.reply(`✦ User ${uid} added.`); }
		if (state === "wlRemoveUserSelect") { const users = config.whiteListMode?.whiteListIds || []; const idx = num - 1; if (isNaN(num) || !users[idx]) return message.reply("𝗫 Invalid."); const removed = users.splice(idx, 1)[0]; config.whiteListMode.whiteListIds = users; saveConfig(); return message.reply(`✦ User ${removed} removed.`); }

		// ══════════════════════════════════════════════════════════════
		//  6. ACCESS & SPAM CONTROL
		// ══════════════════════════════════════════════════════════════
		if (state === "accessControl") {
			config.antiSpam           = config.antiSpam || {};
			config.maintenanceMode    = config.maintenanceMode || {};
			config.commandPerformance = config.commandPerformance || {};
			config.security           = config.security || {};
			if (num === 1)  { config.antiSpam.enable = !config.antiSpam.enable; saveConfig(); return message.reply(`✦ Anti Spam — ${status(config.antiSpam.enable)}`); }
			if (num === 2)  return await sendAndListen(`› Reply with max messages (current: ${config.antiSpam.maxMessages ?? 8}):`, "spamMaxMsgs");
			if (num === 3)  return await sendAndListen(`› Reply with time frame in seconds (current: ${config.antiSpam.timeFrameSeconds ?? 10}):`, "spamTimeFrame");
			if (num === 4)  return await sendAndListen(`› Reply with mute duration in seconds (current: ${config.antiSpam.muteSeconds ?? 20}):`, "spamMuteSecs");
			if (num === 5)  { config.antiSpam.ignoreAdmin = !config.antiSpam.ignoreAdmin; saveConfig(); return message.reply(`✦ Spam Ignore Admin — ${status(config.antiSpam.ignoreAdmin)}`); }
			if (num === 6)  { config.antiSpam.notifyOnMute = !config.antiSpam.notifyOnMute; saveConfig(); return message.reply(`✦ Spam Notify on Mute — ${status(config.antiSpam.notifyOnMute)}`); }
			if (num === 7)  { config.maintenanceMode.enable = !config.maintenanceMode.enable; saveConfig(); return message.reply(`✦ Maintenance Mode — ${status(config.maintenanceMode.enable)}`); }
			if (num === 8)  return await sendAndListen("› Reply with maintenance message:", "maintenanceMsgSet");
			if (num === 9)  { config.maintenanceMode.allowAdminBot = !config.maintenanceMode.allowAdminBot; saveConfig(); return message.reply(`✦ Maintenance Allow Admin — ${status(config.maintenanceMode.allowAdminBot)}`); }
			if (num === 10) { config.commandPerformance.enable = !config.commandPerformance.enable; saveConfig(); return message.reply(`✦ Command Performance Log — ${status(config.commandPerformance.enable)}`); }
			if (num === 11) return await sendAndListen(`› Reply with slow cmd threshold in ms (current: ${config.commandPerformance.slowCommandThresholdMs ?? 4000}):`, "slowCmdThreshSet");
			if (num === 12) { config.security.exposeErrorDetailsInChat = !config.security.exposeErrorDetailsInChat; saveConfig(); return message.reply(`✦ Expose Error Details — ${status(config.security.exposeErrorDetailsInChat)}`); }
			return message.reply("𝗫 Invalid selection.");
		}
		if (state === "spamMaxMsgs")     { if (isNaN(num) || num < 1) return message.reply("𝗫 Invalid."); config.antiSpam.maxMessages = num; saveConfig(); return message.reply(`✦ Max Messages → ${num}`); }
		if (state === "spamTimeFrame")   { if (isNaN(num) || num < 1) return message.reply("𝗫 Invalid."); config.antiSpam.timeFrameSeconds = num; saveConfig(); return message.reply(`✦ Time Frame → ${num}s`); }
		if (state === "spamMuteSecs")    { if (isNaN(num) || num < 1) return message.reply("𝗫 Invalid."); config.antiSpam.muteSeconds = num; saveConfig(); return message.reply(`✦ Mute Duration → ${num}s`); }
		if (state === "maintenanceMsgSet") { if (!input) return message.reply("𝗫 Empty."); config.maintenanceMode.message = input; saveConfig(); return message.reply("✦ Maintenance message updated."); }
		if (state === "slowCmdThreshSet") { if (isNaN(num) || num < 100) return message.reply("𝗫 Invalid (min 100ms)."); config.commandPerformance.slowCommandThresholdMs = num; saveConfig(); return message.reply(`✦ Slow Cmd Threshold → ${num}ms`); }

		// ══════════════════════════════════════════════════════════════
		//  7. FCA OPTIONS
		// ══════════════════════════════════════════════════════════════
		if (state === "fcaOptions") {
			const keys = ["forceLogin","listenEvents","updatePresence","listenTyping","selfListen","selfListenEvent","autoMarkDelivery","autoReconnect"];
			const key  = keys[num - 1];
			if (!key) return message.reply("𝗫 Invalid selection.");
			config.optionsFca = config.optionsFca || {};
			config.optionsFca[key] = !config.optionsFca[key];
			saveConfig();
			try { api.setOptions({ [key]: config.optionsFca[key] }); } catch (e) {}
			return message.reply(`✦ ${key} — ${status(config.optionsFca[key])}`);
		}

		// ══════════════════════════════════════════════════════════════
		//  8. FCA FEATURES
		// ══════════════════════════════════════════════════════════════
		if (state === "fcaFeatures") {
			const threadID = Reply.threadID || event.threadID;

			if (num === 1) {
				await ensureKey(globalData, KEY_ACTIVE, { enabled: false });
				const data = await globalData.get(KEY_ACTIVE, "data", { enabled: false });
				data.enabled = !data.enabled;
				try { await new Promise((res, rej) => { api.setActiveStatus(data.enabled, (err, r) => err ? rej(err) : res(r)); }); } catch (e) {}
				await globalData.set(KEY_ACTIVE, data, "data");
				global._activeStatusEnabled = data.enabled;
				return message.reply(`✦ Active Status — ${status(data.enabled)}`);
			}
			if (num === 2) {
				await ensureKey(globalData, KEY_SEEN, { globalEnabled: false, threads: {} });
				const data = await globalData.get(KEY_SEEN, "data", { globalEnabled: false, threads: {} });
				data.globalEnabled = !data.globalEnabled;
				await globalData.set(KEY_SEEN, data, "data");
				global._autoSeenData = data;
				return message.reply(`✦ AutoSeen Global — ${status(data.globalEnabled)}`);
			}
			if (num === 3) {
				await ensureKey(globalData, KEY_SEEN, { globalEnabled: false, threads: {} });
				const data = await globalData.get(KEY_SEEN, "data", { globalEnabled: false, threads: {} });
				data.threads = data.threads || {};
				data.threads[threadID] = !data.threads[threadID];
				await globalData.set(KEY_SEEN, data, "data");
				global._autoSeenData = data;
				return message.reply(`✦ AutoSeen (this thread) — ${status(data.threads[threadID])}`);
			}
			if (num === 4) {
				await ensureKey(globalData, KEY_STORY, { enabled: false, emoji: "❤️" });
				const data = await globalData.get(KEY_STORY, "data", { enabled: false, emoji: "❤️" });
				data.enabled = !data.enabled;
				await globalData.set(KEY_STORY, data, "data");
				global._storyReactionData = data;
				return message.reply(`✦ Story Auto-React — ${status(data.enabled)}`);
			}
			if (num === 5) return await sendAndListen("⚙️ Reply with emoji or keyword:\nlike 👍 | love ❤️ | haha 😆 | wow 😮 | sad 😢 | angry 😡 | hug 🤗", "storyEmojiSet");
			if (num === 6) { config.enableTypingIndicator = !config.enableTypingIndicator; saveConfig(); return message.reply(`✦ Typing Indicator — ${status(config.enableTypingIndicator)}`); }
			if (num === 7) return await sendAndListen(`› Reply with duration in ms (500–15000), current: ${config.typingDuration ?? 2000}ms:`, "typingDurSet");
			return message.reply("𝗫 Invalid selection.");
		}
		if (state === "storyEmojiSet") {
			const resolved = VALID_STORY_REACTIONS[input.trim().toLowerCase()] || VALID_STORY_REACTIONS[input.trim()];
			if (!resolved) return message.reply("𝗫 Invalid. Use: like, love, haha, wow, sad, angry, hug or the emoji itself.");
			await ensureKey(globalData, KEY_STORY, { enabled: false, emoji: "❤️" });
			const data = await globalData.get(KEY_STORY, "data", { enabled: false, emoji: "❤️" });
			data.emoji = resolved;
			await globalData.set(KEY_STORY, data, "data");
			global._storyReactionData = data;
			return message.reply(`✦ Story emoji → ${resolved}`);
		}
		if (state === "typingDurSet") {
			if (isNaN(num) || num < 500 || num > 15000) return message.reply("𝗫 Use 500–15000ms.");
			config.typingDuration = num;
			saveConfig();
			return message.reply(`✦ Typing Duration → ${num}ms`);
		}

		// ══════════════════════════════════════════════════════════════
		//  9. REACT UNSEND
		// ══════════════════════════════════════════════════════════════
		if (state === "reactUnsend") {
			config.reactUnsend = config.reactUnsend || {};
			if (num === 1) { config.reactUnsend.enable = !config.reactUnsend.enable; saveConfig(); return message.reply(`✦ React Unsend — ${status(config.reactUnsend.enable)}`); }
			if (num === 2) { config.reactUnsend.onlyAdmin = !config.reactUnsend.onlyAdmin; saveConfig(); return message.reply(`✦ Only Admin — ${status(config.reactUnsend.onlyAdmin)}`); }
			if (num === 3) return await sendAndListen("› Reply with emoji to add:", "emojiAdd");
			if (num === 4) {
				const emojis = config.reactUnsend?.emojis || [];
				if (!emojis.length) return message.reply("𝗫 No emojis.");
				return await sendAndListen(box("Remove Emoji", emojis.map((e, i) => `${i + 1}. ${e}`), "Reply number"), "emojiRemoveSelect");
			}
			if (num === 5) return message.reply(`⚙️ Emojis: ${(config.reactUnsend?.emojis || []).join("  ") || "(none)"}`);
			return message.reply("𝗫 Invalid.");
		}
		if (state === "emojiAdd") { const emoji = input.trim(); if (!emoji) return message.reply("𝗫 Invalid."); config.reactUnsend = config.reactUnsend || {}; config.reactUnsend.emojis = config.reactUnsend.emojis || []; if (!config.reactUnsend.emojis.includes(emoji)) config.reactUnsend.emojis.push(emoji); saveConfig(); return message.reply(`✦ Emoji ${emoji} added.`); }
		if (state === "emojiRemoveSelect") { const emojis = config.reactUnsend?.emojis || []; const idx = num - 1; if (isNaN(num) || !emojis[idx]) return message.reply("𝗫 Invalid."); const removed = emojis.splice(idx, 1)[0]; config.reactUnsend.emojis = emojis; saveConfig(); return message.reply(`✦ Emoji ${removed} removed.`); }

		// ══════════════════════════════════════════════════════════════
		//  10. NICKNAME
		// ══════════════════════════════════════════════════════════════
		if (state === "nickname") {
			if (num === 1) return await sendAndListen("› Reply with new nickname:", "nicknameSet");
			if (num === 2) return await sendAndListen("› Reply with nickname to set in ALL groups:", "nicknameSetAll");
			if (num === 3) { config.nickNameBot = ""; saveConfig(); try { await api.changeNickname("", event.threadID, api.getCurrentUserID()); } catch (e) {} return message.reply("✦ Nickname reset."); }
			return message.reply("𝗫 Invalid.");
		}
		if (state === "nicknameSet") { const n = input; if (!n) return message.reply("𝗫 Empty."); config.nickNameBot = n; saveConfig(); try { await api.changeNickname(n, event.threadID, api.getCurrentUserID()); } catch (e) {} return message.reply(`✦ Nickname → ${n}`); }
		if (state === "nicknameSetAll") {
			const n = input; if (!n) return message.reply("𝗫 Empty.");
			config.nickNameBot = n; saveConfig();
			const threads = await api.getThreadList(100, null, ["INBOX"]);
			let success = 0;
			for (const t of threads) { if (!t.isGroup) continue; try { await api.changeNickname(n, t.threadID, api.getCurrentUserID()); success++; } catch (e) {} }
			return message.reply(`✦ Nickname → ${n}\n› Set in ${success} groups.`);
		}

		// ══════════════════════════════════════════════════════════════
		//  11. DATABASE
		// ══════════════════════════════════════════════════════════════
		if (state === "database") {
			config.database = config.database || {};
			if (num === 1) return message.reply("𝗫 Database type can't be changed live. Edit config.json manually and restart.");
			if (num === 2) return await sendAndListen("› Reply with new MongoDB URI:", "mongoUriSet");
			if (num === 3) { config.database.autoSyncWhenStart = !config.database.autoSyncWhenStart; saveConfig(); return message.reply(`✦ Auto Sync on Start — ${status(config.database.autoSyncWhenStart)}`); }
			if (num === 4) { config.database.autoRefreshThreadInfoFirstTime = !config.database.autoRefreshThreadInfoFirstTime; saveConfig(); return message.reply(`✦ Auto Refresh Thread Info — ${status(config.database.autoRefreshThreadInfoFirstTime)}`); }
			return message.reply("𝗫 Invalid.");
		}
		if (state === "mongoUriSet") { if (!input) return message.reply("𝗫 Empty."); config.database = config.database || {}; config.database.uriMongodb = input; saveConfig(); return message.reply("✦ MongoDB URI updated. (Restart for effect.)"); }

		// ══════════════════════════════════════════════════════════════
		//  12. DASHBOARD & UPTIME
		// ══════════════════════════════════════════════════════════════
		if (state === "dashboardUptime") {
			config.dashBoard = config.dashBoard || {};
			config.serverUptime = config.serverUptime || {};
			config.serverUptime.socket = config.serverUptime.socket || {};
			config.autoUptime = config.autoUptime || {};
			if (num === 1)  { config.dashBoard.enable = !config.dashBoard.enable; saveConfig(); return message.reply(`✦ Dashboard — ${status(config.dashBoard.enable)}`); }
			if (num === 2)  return await sendAndListen(`› Reply with dashboard port (current: ${config.dashBoard.port ?? "?"}):`, "dashPortSet");
			if (num === 3)  return await sendAndListen(`› Reply with verify code expiry in ms (current: ${config.dashBoard.expireVerifyCode ?? "?"}):`, "dashExpirySet");
			if (num === 4)  { config.serverUptime.enable = !config.serverUptime.enable; saveConfig(); return message.reply(`✦ Server Uptime — ${status(config.serverUptime.enable)}`); }
			if (num === 5)  return await sendAndListen(`› Reply with server uptime port (current: ${config.serverUptime.port ?? "?"}):`, "uptimePortSet");
			if (num === 6)  { config.serverUptime.socket.enable = !config.serverUptime.socket.enable; saveConfig(); return message.reply(`✦ Socket Enable — ${status(config.serverUptime.socket.enable)}`); }
			if (num === 7)  return await sendAndListen(`› Reply with channel name (current: ${config.serverUptime.socket.channelName || "?"} ):`, "uptimeChannelSet");
			if (num === 8)  { config.autoUptime.enable = !config.autoUptime.enable; saveConfig(); return message.reply(`✦ Auto Uptime — ${status(config.autoUptime.enable)}`); }
			if (num === 9)  return await sendAndListen(`› Reply with auto uptime interval in seconds (current: ${config.autoUptime.timeInterval ?? "?"}):`, "autoUptimeIntervalSet");
			if (num === 10) return await sendAndListen(`› Reply with auto uptime URL (current: ${config.autoUptime.url || "not set"}):`, "autoUptimeUrlSet");
			return message.reply("𝗫 Invalid.");
		}
		if (state === "dashPortSet")          { if (isNaN(num)) return message.reply("𝗫 Invalid."); config.dashBoard.port = num; saveConfig(); return message.reply(`✦ Dashboard Port → ${num}`); }
		if (state === "dashExpirySet")        { if (isNaN(num)) return message.reply("𝗫 Invalid."); config.dashBoard.expireVerifyCode = num; saveConfig(); return message.reply(`✦ Verify Expiry → ${num}ms`); }
		if (state === "uptimePortSet")        { if (isNaN(num)) return message.reply("𝗫 Invalid."); config.serverUptime.port = num; saveConfig(); return message.reply(`✦ Uptime Port → ${num}`); }
		if (state === "uptimeChannelSet")     { if (!input) return message.reply("𝗫 Empty."); config.serverUptime.socket.channelName = input; saveConfig(); return message.reply(`✦ Channel → ${input}`); }
		if (state === "autoUptimeIntervalSet"){ if (isNaN(num)) return message.reply("𝗫 Invalid."); config.autoUptime.timeInterval = num; saveConfig(); return message.reply(`✦ Interval → ${num}s`); }
		if (state === "autoUptimeUrlSet")     { if (!input) return message.reply("𝗫 Empty."); config.autoUptime.url = input; saveConfig(); return message.reply(`✦ URL → ${input}`); }

		// ══════════════════════════════════════════════════════════════
		//  13. MQTT / CONNECTION
		// ══════════════════════════════════════════════════════════════
		if (state === "mqttConn") {
			config.restartListenMqtt = config.restartListenMqtt || {};
			if (num === 1) { config.restartListenMqtt.enable = !config.restartListenMqtt.enable; saveConfig(); return message.reply(`✦ Restart Listen MQTT — ${status(config.restartListenMqtt.enable)}`); }
			if (num === 2) return await sendAndListen(`› Reply with restart interval in ms (current: ${config.restartListenMqtt.timeRestart ?? "?"}):`, "mqttTimeRestartSet");
			if (num === 3) return await sendAndListen(`› Reply with delay after stop in ms (current: ${config.restartListenMqtt.delayAfterStopListening ?? "?"}):`, "mqttDelaySet");
			if (num === 4) { config.restartListenMqtt.logNoti = !config.restartListenMqtt.logNoti; saveConfig(); return message.reply(`✦ Log Notification — ${status(config.restartListenMqtt.logNoti)}`); }
			if (num === 5) { try { if (global.GoatBot.stopListening) { global.GoatBot.stopListening(); } } catch (e) {} return message.reply("✦ Attempting to restart listener. Check bot logs."); }
			return message.reply("𝗫 Invalid.");
		}
		if (state === "mqttTimeRestartSet") { if (isNaN(num)) return message.reply("𝗫 Invalid."); config.restartListenMqtt.timeRestart = num; saveConfig(); return message.reply(`✦ Restart interval → ${num}ms`); }
		if (state === "mqttDelaySet")       { if (isNaN(num)) return message.reply("𝗫 Invalid."); config.restartListenMqtt.delayAfterStopListening = num; saveConfig(); return message.reply(`✦ Delay → ${num}ms`); }

		// ══════════════════════════════════════════════════════════════
		//  14. NOTIFICATIONS
		// ══════════════════════════════════════════════════════════════
		if (state === "notifications") {
			config.notiWhenListenMqttError = config.notiWhenListenMqttError || {};
			config.notiWhenListenMqttError.gmail       = config.notiWhenListenMqttError.gmail       || {};
			config.notiWhenListenMqttError.telegram    = config.notiWhenListenMqttError.telegram    || {};
			config.notiWhenListenMqttError.discordHook = config.notiWhenListenMqttError.discordHook || {};
			if (num === 1) { config.notiWhenListenMqttError.gmail.enable = !config.notiWhenListenMqttError.gmail.enable; saveConfig(); return message.reply(`✦ Gmail Notify — ${status(config.notiWhenListenMqttError.gmail.enable)}`); }
			if (num === 2) return await sendAndListen("› Reply with notification email:", "notiGmailSet");
			if (num === 3) { config.notiWhenListenMqttError.telegram.enable = !config.notiWhenListenMqttError.telegram.enable; saveConfig(); return message.reply(`✦ Telegram Notify — ${status(config.notiWhenListenMqttError.telegram.enable)}`); }
			if (num === 4) return await sendAndListen("› Reply with Telegram bot token:", "notiTgTokenSet");
			if (num === 5) return await sendAndListen("› Reply with Telegram chat ID:", "notiTgChatSet");
			if (num === 6) { config.notiWhenListenMqttError.discordHook.enable = !config.notiWhenListenMqttError.discordHook.enable; saveConfig(); return message.reply(`✦ Discord Notify — ${status(config.notiWhenListenMqttError.discordHook.enable)}`); }
			if (num === 7) return await sendAndListen("› Reply with Discord webhook URL:", "notiDiscordSet");
			return message.reply("𝗫 Invalid.");
		}
		if (state === "notiGmailSet")    { if (!input) return message.reply("𝗫 Empty."); config.notiWhenListenMqttError.gmail.emailGetNoti = input; saveConfig(); return message.reply(`✦ Notify Email → ${input}`); }
		if (state === "notiTgTokenSet")  { if (!input) return message.reply("𝗫 Empty."); config.notiWhenListenMqttError.telegram.botToken = input; saveConfig(); return message.reply("✦ Telegram bot token updated."); }
		if (state === "notiTgChatSet")   { if (!input) return message.reply("𝗫 Empty."); config.notiWhenListenMqttError.telegram.chatId = input; saveConfig(); return message.reply(`✦ Telegram Chat ID → ${input}`); }
		if (state === "notiDiscordSet")  { if (!input) return message.reply("𝗫 Empty."); config.notiWhenListenMqttError.discordHook.webhookUrl = input; saveConfig(); return message.reply("✦ Discord webhook updated."); }

		// ══════════════════════════════════════════════════════════════
		//  15. LOGGING & DEBUG
		// ══════════════════════════════════════════════════════════════
		if (state === "loggingDebug") {
			config.logEvents        = config.logEvents        || {};
			config.hideNotiMessage  = config.hideNotiMessage  || {};
			const leKeys = ["disableAll","message","message_reaction","message_unsend","message_reply","event","read_receipt","typ","presence","groupLogDebug"];
			const hnKeys = ["commandNotFound","adminOnly","threadBanned","userBanned","needRoleToUseCmd","needRoleToUseCmdOnReply","needRoleToUseCmdOnReaction"];
			if (num >= 1 && num <= 10) { const key = leKeys[num - 1]; config.logEvents[key] = !config.logEvents[key]; saveConfig(); return message.reply(`✦ Log ${key} — ${status(config.logEvents[key])}`); }
			if (num >= 11 && num <= 17) { const key = hnKeys[num - 11]; config.hideNotiMessage[key] = !config.hideNotiMessage[key]; saveConfig(); return message.reply(`✦ Hide ${key} — ${status(config.hideNotiMessage[key])}`); }
			return message.reply("𝗫 Invalid selection.");
		}

		// ══════════════════════════════════════════════════════════════
		//  16. E2EE SETTINGS
		// ══════════════════════════════════════════════════════════════
		if (state === "e2eeSettings") {
			config.e2ee = config.e2ee || {};
			if (num === 1) {
				const was = config.e2ee.enable;
				config.e2ee.enable = !was;
				saveConfig();
				const sent = await message.reply(
					`✦ E2EE → ${status(config.e2ee.enable)}\n⚠️ Restart required.\n› React to this message to restart now.`
				);
				global.GoatBot.onReaction.set(sent.messageID, {
					commandName: "setting",
					messageID: sent.messageID,
					type: "e2eeRestartConfirm",
					author,
				});
				return;
			}
			if (num === 2) { config.e2ee.memoryOnly = !config.e2ee.memoryOnly; saveConfig(); return message.reply(`✦ E2EE Memory Only — ${status(config.e2ee.memoryOnly)}`); }
			if (num === 3) { config.e2ee.autoReconnect = !config.e2ee.autoReconnect; saveConfig(); return message.reply(`✦ E2EE Auto Reconnect — ${status(config.e2ee.autoReconnect)}`); }
			if (num === 4) return await sendAndListen("› Reply with log level (none / error / warn / info / verbose):", "e2eeLogLevelSet");
			if (num === 5) return await sendAndListen("› Reply with save type (path / memory):", "e2eeSaveTypeSet");
			if (num === 6) return await sendAndListen(`› Reply with device path (current: ${config.e2ee.devicePath || "not set"}):`, "e2eeDevicePathSet");
			return message.reply("𝗫 Invalid.");
		}
		if (state === "e2eeLogLevelSet")   { const valid = ["none","error","warn","info","verbose"]; if (!valid.includes(input)) return message.reply(`𝗫 Use: ${valid.join(", ")}`); config.e2ee.logLevel = input; saveConfig(); return message.reply(`✦ E2EE Log Level → ${input}`); }
		if (state === "e2eeSaveTypeSet")   { const valid = ["path","memory"]; if (!valid.includes(input)) return message.reply(`𝗫 Use: ${valid.join(", ")}`); config.e2ee.saveType = input; saveConfig(); return message.reply(`✦ E2EE Save Type → ${input}`); }
		if (state === "e2eeDevicePathSet") { if (!input) return message.reply("𝗫 Empty."); config.e2ee.devicePath = input; saveConfig(); return message.reply(`✦ E2EE Device Path → ${input}`); }

		// ══════════════════════════════════════════════════════════════
		//  17. TWO-ID MODE
		// ══════════════════════════════════════════════════════════════
		if (state === "twoIdMode") {
			config.twoIdMode = config.twoIdMode || {};
			if (num === 1) { config.twoIdMode.enable = !config.twoIdMode.enable; saveConfig(); return message.reply(`✦ Two-ID Mode — ${status(config.twoIdMode.enable)}\n⚠️ Restart required.`); }
			if (num === 2) return await sendAndListen(`› Reply with secondary account file path (current: ${config.twoIdMode.secondaryAccountPath || "account2.txt"}):`, "twoIdPathSet");
			if (num === 3) return await sendAndListen(`› Reply with fail count before switch (current: ${config.twoIdMode.switchAfterFailedAttempts ?? 2}):`, "twoIdFailCountSet");
			return message.reply("𝗫 Invalid.");
		}
		if (state === "twoIdPathSet")      { if (!input) return message.reply("𝗫 Empty."); config.twoIdMode.secondaryAccountPath = input; saveConfig(); return message.reply(`✦ Secondary Account Path → ${input}`); }
		if (state === "twoIdFailCountSet") { if (isNaN(num) || num < 1) return message.reply("𝗫 Invalid."); config.twoIdMode.switchAfterFailedAttempts = num; saveConfig(); return message.reply(`✦ Switch After Fails → ${num}`); }

		// ══════════════════════════════════════════════════════════════
		//  18. CREDENTIALS
		// ══════════════════════════════════════════════════════════════
		if (state === "credentials") {
			config.credentials = config.credentials || {};
			config.credentials.gmailAccount = config.credentials.gmailAccount || {};
			config.credentials.gRecaptcha   = config.credentials.gRecaptcha   || {};
			const fields = [
				["gmailAccount","email",        "Gmail Email"],
				["gmailAccount","clientId",     "Gmail Client ID"],
				["gmailAccount","clientSecret", "Gmail Client Secret"],
				["gmailAccount","refreshToken", "Gmail Refresh Token"],
				["gmailAccount","apiKey",        "Gmail API Key"],
				["gRecaptcha",  "siteKey",      "reCAPTCHA Site Key"],
				["gRecaptcha",  "secretKey",    "reCAPTCHA Secret Key"],
			];
			const field = fields[num - 1];
			if (!field) return message.reply("𝗫 Invalid selection.");
			return await sendAndListen(`› Reply with new value for ${field[2]}:`, "credSet", { credSection: field[0], credKey: field[1] });
		}
		if (state === "credSet") {
			const { credSection, credKey } = Reply;
			if (!input) return message.reply("𝗫 Empty.");
			config.credentials[credSection][credKey] = input;
			saveConfig();
			return message.reply("✦ Updated.");
		}
	},

	// ─────────────────────────────────────────────────────────────────
	onReaction: async function ({ api, event, Reaction, message }) {
		if (Reaction.type !== "e2eeRestartConfirm") return;
		if (event.userID !== Reaction.author) return;
		const tmpPath = `${process.cwd()}/scripts/cmds/tmp/restart.txt`;
		try {
			const fs2 = require("fs-extra");
			fs2.ensureDirSync(require("path").dirname(tmpPath));
			fs2.writeFileSync(tmpPath, `${event.threadID} ${Date.now()}`);
		} catch (e) {}
		await message.reply("🔄 Restarting to apply E2EE change...");
		process.exit(2);
	},
};
