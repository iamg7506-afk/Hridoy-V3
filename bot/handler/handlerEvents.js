const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];
// const { config } = global.GoatBot;
// const { utils } = global;

// ── E2EE JID detection ───────────────────────────────────────────────────────
// E2EE thread IDs contain "@" (e.g. "12345:69@msgr" or "98765@group.facebook.com").
// Regular Messenger thread IDs are pure numeric strings.
function isE2EEJID(id) {
	return typeof id === "string" && id.indexOf("@") !== -1;
}

// ── Synthetic threadData for E2EE threads ────────────────────────────────────
// E2EE JIDs are never stored in the GoatBot database (they contain "@",
// so !isNaN(threadID) is false and threadsData.create() is never called).
// Without a real threadData the rest of handlerEvents crashes on
// threadData.settings.hideNotiMessage, threadData.banned, etc.
// This helper builds a minimal threadData that satisfies all those accesses.
function makeE2EEThreadData(threadID, isGroup) {
	return {
		threadID,
		adminIDs: [],
		isGroup: !!isGroup,
		banned: { status: false, reason: "", date: "" },
		settings: { hideNotiMessage: {} },
		data: {
			onlyAdminBox: false,
			ignoreCommanToOnlyAdminBox: [],
			hideNotiMessageOnlyAdminBox: false,
			setRole: {},
			lang: null
		}
	};
}

function getType(obj) {
	return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
	const adminBot = global.GoatBot.config.adminBot || [];
	if (!senderID)
		return 0;
	const adminBox = threadData ? threadData.adminIDs || [] : [];
	return adminBot.includes(senderID) ? 2 : adminBox.includes(senderID) ? 1 : 0;
}

function getText(type, reason, time, targetID, lang) {
	const utils = global.utils;
	if (type == "userBanned")
		return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
	else if (type == "threadBanned")
		return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
	else if (type == "onlyAdminBox")
		return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
	else if (type == "onlyAdminBot")
		return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
}

// ═══════════ Centralized, safe error reporting (new) ═══════════
// Previously every catch block below built its own chat reply by splicing
// the raw error stack trace (file paths, line numbers, internal module
// names, sometimes config/env values baked into an error message) directly
// into a message sent to the thread - visible to any member of a group,
// not just the bot owner. That's an information-disclosure bug (audit
// requirement: "Sensitive information unnecessarily expose করা যাবে না").
//
// This helper keeps full details in the server-side log (command, thread,
// user, error name/message/stack, timestamp) and sends a short,
// user-friendly message to chat instead. Set
// config.security.exposeErrorDetailsInChat = true in config.json to restore
// the old verbose-in-chat behavior (useful for a private dev/test bot) -
// off by default for anything running in a real group.
function reportCommandError({ err, langKey, commandName, senderID, threadID, time, langCode }) {
	const errorId = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
	const utils = global.utils;

	try {
		require("../../logger/log.js").err(
			"COMMAND_ERROR",
			`[${errorId}] stage=${langKey} command=${commandName} thread=${threadID} user=${senderID} time=${time} type=${err && err.name} message=${err && err.message}`,
			err
		);
	}
	catch (e) { /* logging must never throw further */ }

	const exposeDetails = !!(global.GoatBot?.config?.security?.exposeErrorDetailsInChat);

	if (exposeDetails) {
		const stackPreview = utils.removeHomeDir(err && err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2));
		return utils.getText({ lang: langCode, head: "handlerEvents" }, langKey, time, commandName, stackPreview);
	}

	return utils.getText({ lang: langCode, head: "handlerEvents" }, "errorOccurredSafe", time, commandName, errorId);
}

function replaceShortcutInLang(text, prefix, commandName) {
	return text
		.replace(/\{(?:p|prefix)\}/g, prefix)
		.replace(/\{(?:n|name)\}/g, commandName)
		.replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
	let roleConfig;
	if (utils.isNumber(command.config.role)) {
		roleConfig = {
			onStart: command.config.role
		};
	}
	else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
		if (!command.config.role.onStart)
			command.config.role.onStart = 0;
		roleConfig = command.config.role;
	}
	else {
		roleConfig = {
			onStart: 0
		};
	}

	if (isGroup)
		roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;

	for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
		if (roleConfig[key] == undefined)
			roleConfig[key] = roleConfig.onStart;
	}

	return roleConfig;
	// {
	// 	onChat,
	// 	onStart,
	// 	onReaction,
	// 	onReply
	// }
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
	const config = global.GoatBot.config;
	const { adminBot, hideNotiMessage } = config;

	// ✅ FIX: null userData guard — reaction/reply sender may not be in DB yet
	if (!userData) return false;

	// check if user banned
	const infoBannedUser = userData.banned;
	if (infoBannedUser && infoBannedUser.status == true) {
		const { reason, date } = infoBannedUser;
		if (hideNotiMessage.userBanned == false)
			message.reply(getText("userBanned", reason, date, senderID, lang));
		return true;
	}

	// check if only admin bot
	if (
		config.adminOnly.enable == true
		&& !adminBot.includes(senderID)
		&& !config.adminOnly.ignoreCommand.includes(commandName)
	) {
		if (hideNotiMessage.adminOnly == false)
			message.reply(getText("onlyAdminBot", null, null, null, lang));
		return true;
	}

	// ==========    Check Thread    ========== //
	if (isGroup == true) {
		if (
			threadData.data.onlyAdminBox === true
			&& !threadData.adminIDs.includes(senderID)
			&& !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)
		) {
			// check if only admin box
			if (!threadData.data.hideNotiMessageOnlyAdminBox)
				message.reply(getText("onlyAdminBox", null, null, null, lang));
			return true;
		}

		// check if thread banned
		const infoBannedThread = threadData.banned;
		if (infoBannedThread.status == true) {
			const { reason, date } = infoBannedThread;
			if (hideNotiMessage.threadBanned == false)
				message.reply(getText("threadBanned", reason, date, threadID, lang));
			return true;
		}
	}
	return false;
}


function createGetText2(langCode, pathCustomLang, prefix, command) {
	const commandType = command.config.countDown ? "command" : "command event";
	const commandName = command.config.name;
	let customLang = {};
	let getText2 = () => { };
	if (fs.existsSync(pathCustomLang))
		customLang = require(pathCustomLang)[commandName]?.text || {};
	if (command.langs || customLang || {}) {
		getText2 = function (key, ...args) {
			let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
			lang = replaceShortcutInLang(lang, prefix, commandName);
			for (let i = args.length - 1; i >= 0; i--)
				lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
			return lang || `❌ Can't find text on language "${langCode}" for ${commandType} "${commandName}" with key "${key}"`;
		};
	}
	return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
	return async function (event, message) {

		const { utils, client, GoatBot } = global;
		const { getPrefix, removeHomeDir, log, getTime } = utils;
		const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
		const { autoRefreshThreadInfoFirstTime } = config.database;
		let { hideNotiMessage = {} } = config;

		const { body, messageID, threadID, isGroup } = event;

		// Check if has threadID
		if (!threadID)
			return;

		const senderID = event.userID || event.senderID || event.author;

		let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
		let userData = global.db.allUserData.find(u => u.userID == senderID);

		// ── E2EE JID handling ────────────────────────────────────────────────────
		// E2EE thread IDs contain "@" so !isNaN(threadID) is false.
		// We cannot store them in the regular DB, so we use a synthetic threadData
		// and skip DB-level thread creation and refreshInfo entirely.
		const _isE2EEThread = isE2EEJID(threadID);

		if (!userData && !isNaN(senderID)) {
			try {
				userData = await usersData.create(senderID);
			} catch (e) {
				// Non-fatal: fallback minimal userData so commands still run
				userData = {
					userID: senderID,
					name: senderID,
					banned: { status: false, reason: "", date: "" },
					data: {},
					settings: {}
				};
			}
		}

		if (_isE2EEThread) {
			// Use a minimal synthetic threadData for E2EE JID threads.
			// Preserve any cached threadData if we previously created one.
			if (!threadData) {
				threadData = makeE2EEThreadData(threadID, event.isGroup);
			}
		} else if (!threadData && !isNaN(threadID)) {
			if (global.temp.createThreadDataError.includes(threadID))
				return;
			try {
				threadData = await threadsData.create(threadID);
			} catch (e) {
				global.temp.createThreadDataError.push(threadID);
				return;
			}
			global.db.receivedTheFirstMessage[threadID] = true;
		} else if (!_isE2EEThread) {
			if (
				autoRefreshThreadInfoFirstTime === true
				&& !global.db.receivedTheFirstMessage[threadID]
			) {
				global.db.receivedTheFirstMessage[threadID] = true;
				try { await threadsData.refreshInfo(threadID); } catch (_) {}
			}
		}

		// Final guard: if threadData is still null (e.g. unknown non-numeric non-JID),
		// build a minimal synthetic object so nothing crashes below.
		if (!threadData) {
			threadData = makeE2EEThreadData(threadID, !!event.isGroup);
		}

		if (typeof threadData.settings?.hideNotiMessage == "object")
			hideNotiMessage = threadData.settings.hideNotiMessage;

		{ // toru feature: optional read/delivered receipts like a real client (config.humanBehavior)
			const hb = config.humanBehavior || {};
			if (!_isE2EEThread && event.type !== "typ" && event.type !== "presence") {
				try {
					const off = (() => { try { const f = require("path").join(__dirname, "..", "..", "scripts/cmds/cache/autoseen.json"); return fs.existsSync(f) && (fs.readJsonSync(f, { throws: false }) || {}).status === false; } catch (_) { return false; } })();
					if (hb.markAsRead && !off && typeof api.markAsRead === "function") Promise.resolve(api.markAsRead(threadID)).catch(() => {});
					if (hb.markAsDelivered && event.messageID && typeof api.markAsDelivered === "function") Promise.resolve(api.markAsDelivered(threadID, event.messageID)).catch(() => {});
				} catch (_) { /* never block message handling */ }
			}
		}
		const prefix = getPrefix(threadID);
		const role = getRole(threadData, senderID);
		const parameters = {
			api, usersData, threadsData, message, event,
			userModel, threadModel, prefix, dashBoardModel,
			globalModel, dashBoardData, globalData, envCommands,
			envEvents, envGlobal, role,
			removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
				if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
					throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
				for (let i = 0; i < arguments.length; i++)
					if (typeof arguments[i] != "string")
						throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);

				return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
			}
		};
		const langCode = threadData.data.lang || config.language || "en";

		function createMessageSyntaxError(commandName) {
			message.SyntaxError = async function () {
				return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName));
			};
		}

		/*
			+-----------------------------------------------+
			|							 WHEN CALL COMMAND								|
			+-----------------------------------------------+
		*/
		let isUserCallCommand = false;
		async function onStart() {
			// —————————————— CHECK USE BOT —————————————— //
			if (!body) return;

			// ══════════ NO PREFIX SYSTEM (Advanced Mode) ══════════
			// mode: "off"   → prefix required for everyone
			// mode: "admin" → only adminBot can skip prefix (default legacy)
			// mode: "all"   → everyone can skip prefix
			const noPrefixCfg  = global.GoatBot.config.noPrefix || {};
			const noPrefixMode = noPrefixCfg.mode || (noPrefixCfg.enable ? "admin" : "off");
			const isAdminBot   = (global.GoatBot.config.adminBot || []).includes(senderID);

			let usedPrefix  = prefix;
			let bodyToParse = body;

			if (body.startsWith(prefix)) {
				// Normal prefixed command — always allowed
				bodyToParse = body;
				usedPrefix  = prefix;
			} else if (noPrefixMode !== "off") {
				// No-prefix path — check eligibility
				const allowedWithoutPrefix =
					noPrefixMode === "all" ||
					(noPrefixMode === "admin" && isAdminBot);

				if (allowedWithoutPrefix) {
					const possibleCmd = body.trim().split(/ +/)[0].toLowerCase();
					const cmdExists   = GoatBot.commands.has(possibleCmd) ||
					                    GoatBot.commands.has(GoatBot.aliases.get(possibleCmd));
					if (!cmdExists) return;
					usedPrefix  = "";
					bodyToParse = body;
				} else {
					return;
				}
			} else {
				return;
			}
			// ══════════════════════════════════════════════════════

			const dateNow = Date.now();
			const args = bodyToParse.slice(usedPrefix.length).trim().split(/ +/);
			// ————————————  CHECK HAS COMMAND ——————————— //
			let commandName = args.shift().toLowerCase();
			let command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
			// ———————— CHECK ALIASES SET BY GROUP ———————— //
			const aliasesData = threadData.data.aliases || {};
			for (const cmdName in aliasesData) {
				if (aliasesData[cmdName].includes(commandName)) {
					command = GoatBot.commands.get(cmdName);
					break;
				}
			}
			// ————————————— SET COMMAND NAME ————————————— //
			if (command)
				commandName = command.config.name;
			// ——————— FUNCTION REMOVE COMMAND NAME ———————— //
			function removeCommandNameFromBody(body_, prefix_, commandName_) {
				if (arguments.length) {
					if (typeof body_ != "string")
						throw new Error(`The first argument (body) must be a string, but got "${getType(body_)}"`);
					if (typeof prefix_ != "string")
						throw new Error(`The second argument (prefix) must be a string, but got "${getType(prefix_)}"`);
					if (typeof commandName_ != "string")
						throw new Error(`The third argument (commandName) must be a string, but got "${getType(commandName_)}"`);

					return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
				}
				else {
					return body.replace(new RegExp(`^${usedPrefix}(\\s+|)${commandName}`, "i"), "").trim();
				}
			}
			// —————  CHECK BANNED OR ONLY ADMIN BOX  ————— //
			if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
				return;
				if (!command) {
				if (!hideNotiMessage.commandNotFound && (!commandName || commandName.trim() === ""))
					return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "prefixOnly", prefix));
				if (!hideNotiMessage.commandNotFound && commandName) {
					const input = commandName.toLowerCase();
					const allCommands = Array.from(GoatBot.commands.keys());
					function levenDist(a, b) {
						const m = a.length, n = b.length;
						const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i||j));
						for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
							dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
						return dp[m][n];
					}
					const scored = allCommands.map(cmd => {
						const c = cmd.toLowerCase();
						const substringBonus = input.includes(c) || c.includes(input) ? -100 : 0;
						return { cmd, score: levenDist(input, c) + substringBonus };
					});
					scored.sort((a, b) => a.score - b.score);
					const bestScore = scored[0].score;
					const top = scored.filter(s => s.score <= bestScore + 1).slice(0, 3).map(s => `› ${prefix}${s.cmd}`);
					return await message.reply(
						utils.getText({ lang: langCode, head: "handlerEvents" }, "commandNotFoundSuggestion", top.join("\n"), prefix)
					);
				} else return true;
			}
			// ————————————— CHECK PERMISSION ———————————— //
			const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
			const needRole = roleConfig.onStart;

			if (needRole > role) {
				if (!hideNotiMessage.needRoleToUseCmd) {
					if (needRole == 1)
						return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdmin", commandName));
					else if (needRole == 2)
						return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2", commandName));
				}
				else {
					return true;
				}
			}
			// ———————————————— CONTENT GATE (NSFW policy) ———————————————— //
			{
				const gate = require("../../utils/contentGate.js").check(command, role);
				if (gate.blocked) {
					if (!hideNotiMessage.needRoleToUseCmd)
						return await message.reply(gate.message);
					return true;
				}
			}
			// ———————————— PER-GROUP SWITCH + RATE LIMIT (toru-pro) ———————————— //
			{
				const gsCfg = global.GoatBot.config.groupSettings || {};
				if (gsCfg.enable !== false && role < 2 && require("../../utils/groupSettings.js").isCommandDisabled(threadData, command.config.name)) {
					if (!hideNotiMessage.needRoleToUseCmd)
						return await message.reply(`🚫 "${command.config.name}" is switched off in this group.`);
					return true;
				}
				const rl = require("../../utils/rateLimiter.js").check(command.config.name, senderID, role >= 2);
				if (!rl.allowed) {
					if (rl.notify) return await message.reply(`⏳ Slow down — "${command.config.name}" can be used ${rl.limit.maxUses}× per ${rl.limit.perSeconds}s. Try again in ${rl.retryAfterSec}s.`);
					return true;
				}
			}
			// ———————————————— countDown ———————————————— //
			if (!client.countDown[commandName])
				client.countDown[commandName] = {};
			const timestamps = client.countDown[commandName];
			let getCoolDown = command.config.countDown;
			if (!getCoolDown && getCoolDown != 0 || isNaN(getCoolDown))
				getCoolDown = 1;
			const cooldownCommand = getCoolDown * 1000;
			// ═══════════ Admin Cooldown Bypass (new) ═══════════
			const isAdminBotForCooldown = (global.GoatBot.config.adminBot || []).includes(senderID);
			const bypassCooldown = global.GoatBot.config.cooldownBypassAdmin === true && isAdminBotForCooldown;
			if (!bypassCooldown && timestamps[senderID]) {
				const expirationTime = timestamps[senderID] + cooldownCommand;
				if (dateNow < expirationTime)
					return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "waitingForCommand", ((expirationTime - dateNow) / 1000).toString().slice(0, 3)));
			}
			// ——————————————— RUN COMMAND ——————————————— //
			const time = getTime("DD/MM/YYYY HH:mm:ss");
			isUserCallCommand = true;

			// ————————— TYPING INDICATOR ON ————————— //
			// E2EE threads (JID format with "@") do not support typing indicators —
			// skip the call instead of letting it fail noisily.
			try {
				// @eryxenx/fca humanizer already shows typing for command-like messages and clears it on reply;
				// only fall back to a manual call when that built-in indicator is not present.
				if (typeof api.getTypingIndicator != "function" && typeof api.sendTypingIndicator == "function" && !isE2EEJID(threadID))
					await api.sendTypingIndicator(threadID, true);
			} catch (err) {
				log.err("TYPING_INDICATOR", "Failed to turn on typing indicator", err);
			}

			try {
				// analytics command call
				(async () => {
					const analytics = await globalData.get("analytics", "data", {});
					if (!analytics[commandName])
						analytics[commandName] = 0;
					analytics[commandName]++;
					await globalData.set("analytics", analytics, "data");
				})();

				createMessageSyntaxError(commandName);
				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);

				// ═══════════ Command Execution Time Tracking (new) ═══════════
				const perfCfg = global.GoatBot.config.commandPerformance || {};
				const execStart = Date.now();

				await command.onStart({
					...parameters,
					args,
					commandName,
					getLang: getText2,
					removeCommandNameFromBody
				});

				if (perfCfg.enable) {
					const execMs = Date.now() - execStart;
					const threshold = perfCfg.slowCommandThresholdMs ?? 4000;
					if (execMs >= threshold) {
						log.perf("SLOW COMMAND", `${commandName} took ${execMs}ms | user: ${userData.name} (${senderID}) | thread: ${threadID}`);
					}
				}

				timestamps[senderID] = dateNow;
				log.info("CALL COMMAND", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
			}
			catch (err) {
				log.err("CALL COMMAND", `An error occurred when calling the command ${commandName}`, err);
				return await message.reply(reportCommandError({ err, langKey: "errorOccurred", commandName, senderID, threadID, time, langCode }));
			}
			finally {
				// ————————— TYPING INDICATOR OFF ————————— //
				try {
					if (typeof api.getTypingIndicator != "function" && typeof api.sendTypingIndicator == "function" && !isE2EEJID(threadID))
						await api.sendTypingIndicator(threadID, false);
				} catch (err) {
					log.err("TYPING_INDICATOR", "Failed to turn off typing indicator", err);
				}
			}
		}


		/*
		 +------------------------------------------------+
		 |                    ON CHAT                     |
		 +------------------------------------------------+
		*/
		async function onChat() {
			const allOnChat = GoatBot.onChat || [];
			const args = body ? body.split(/ +/) : [];
			for (const key of allOnChat) {
				const command = GoatBot.commands.get(key);
				if (!command)
					continue;
				const commandName = command.config.name;

				// —————————————— CHECK PERMISSION —————————————— //
				const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
				const needRole = roleConfig.onChat;
				if (needRole > role)
					continue;

				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
				const time = getTime("DD/MM/YYYY HH:mm:ss");
				createMessageSyntaxError(commandName);

				if (getType(command.onChat) == "Function") {
					const defaultOnChat = command.onChat;
					// convert to AsyncFunction
					command.onChat = async function () {
						return defaultOnChat(...arguments);
					};
				}

				command.onChat({
					...parameters,
					isUserCallCommand,
					args,
					commandName,
					getLang: getText2
				})
					.then(async (handler) => {
						if (typeof handler == "function") {
							if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
								return;
							try {
								await handler();
								log.info("onChat", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
							}
							catch (err) {
								await message.reply(reportCommandError({ err, langKey: "errorOccurred2", commandName, senderID, threadID, time, langCode }));
							}
						}
					})
					.catch(err => {
						log.err("onChat", `An error occurred when calling the command onChat ${commandName}`, err);
					});
			}
		}


		/*
		 +------------------------------------------------+
		 |                   ON ANY EVENT                 |
		 +------------------------------------------------+
		*/
		async function onAnyEvent() {
			const allOnAnyEvent = GoatBot.onAnyEvent || [];
			let args = [];
			if (typeof event.body == "string" && event.body.startsWith(prefix))
				args = event.body.split(/ +/);

			for (const key of allOnAnyEvent) {
				if (typeof key !== "string")
					continue;
				const command = GoatBot.commands.get(key);
				if (!command)
					continue;
				const commandName = command.config.name;
				const time = getTime("DD/MM/YYYY HH:mm:ss");
				createMessageSyntaxError(commandName);

				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

				if (getType(command.onAnyEvent) == "Function") {
					const defaultOnAnyEvent = command.onAnyEvent;
					// convert to AsyncFunction
					command.onAnyEvent = async function () {
						return defaultOnAnyEvent(...arguments);
					};
				}

				command.onAnyEvent({
					...parameters,
					args,
					commandName,
					getLang: getText2
				})
					.then(async (handler) => {
						if (typeof handler == "function") {
							try {
								await handler();
								log.info("onAnyEvent", `${commandName} | ${senderID} | ${userData.name} | ${threadID}`);
							}
							catch (err) {
								message.reply(reportCommandError({ err, langKey: "errorOccurred7", commandName, senderID, threadID, time, langCode }));
								log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
							}
						}
					})
					.catch(err => {
						log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
					});
			}
		}

		/*
		 +------------------------------------------------+
		 |                  ON FIRST CHAT                 |
		 +------------------------------------------------+
		*/
		async function onFirstChat() {
			const allOnFirstChat = GoatBot.onFirstChat || [];
			const args = body ? body.split(/ +/) : [];

			for (const itemOnFirstChat of allOnFirstChat) {
				const { commandName, threadIDsChattedFirstTime } = itemOnFirstChat;
				if (threadIDsChattedFirstTime.includes(threadID))
					continue;
				const command = GoatBot.commands.get(commandName);
				if (!command)
					continue;

				itemOnFirstChat.threadIDsChattedFirstTime.push(threadID);
				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
				const time = getTime("DD/MM/YYYY HH:mm:ss");
				createMessageSyntaxError(commandName);

				if (getType(command.onFirstChat) == "Function") {
					const defaultOnFirstChat = command.onFirstChat;
					// convert to AsyncFunction
					command.onFirstChat = async function () {
						return defaultOnFirstChat(...arguments);
					};
				}

				command.onFirstChat({
					...parameters,
					isUserCallCommand,
					args,
					commandName,
					getLang: getText2
				})
					.then(async (handler) => {
						if (typeof handler == "function") {
							if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
								return;
							try {
								await handler();
								log.info("onFirstChat", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
							}
							catch (err) {
								await message.reply(reportCommandError({ err, langKey: "errorOccurred2", commandName, senderID, threadID, time, langCode }));
							}
						}
					})
					.catch(err => {
						log.err("onFirstChat", `An error occurred when calling the command onFirstChat ${commandName}`, err);
					});
			}
		}


		/* 
		 +------------------------------------------------+
		 |                    ON REPLY                    |
		 +------------------------------------------------+
		*/
		async function onReply() {
			if (!event.messageReply)
				return;
			const { onReply } = GoatBot;
			const Reply = onReply.get(event.messageReply.messageID);
			if (!Reply)
				return;
			Reply.delete = () => onReply.delete(messageID);
			const commandName = Reply.commandName;
			if (!commandName) {
				message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
				return log.err("onReply", `Can't find command name to execute this reply!`, Reply);
			}
			const command = GoatBot.commands.get(commandName);
			if (!command) {
				message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
				return log.err("onReply", `Command "${commandName}" not found`, Reply);
			}

			// —————————————— CHECK PERMISSION —————————————— //
			const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
			const needRole = roleConfig.onReply;
			if (needRole > role) {
				if (!hideNotiMessage.needRoleToUseCmdOnReply) {
					if (needRole == 1)
						return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReply", commandName));
					else if (needRole == 2)
						return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReply", commandName));
				}
				else {
					return true;
				}
			}

			const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
			const time = getTime("DD/MM/YYYY HH:mm:ss");
			try {
				if (!command)
					throw new Error(`Cannot find command with commandName: ${commandName}`);
				const args = body ? body.split(/ +/) : [];
				createMessageSyntaxError(commandName);
				if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
					return;
				await command.onReply({
					...parameters,
					Reply,
					args,
					commandName,
					getLang: getText2
				});
				log.info("onReply", `${commandName} | ${userData.name} | ${senderID} | ${threadID} | ${args.join(" ")}`);
			}
			catch (err) {
				log.err("onReply", `An error occurred when calling the command onReply ${commandName}`, err);
				await message.reply(reportCommandError({ err, langKey: "errorOccurred3", commandName, senderID, threadID, time, langCode }));
			}
		}


		/*
		 +------------------------------------------------+
		 |                   ON REACTION                  |
		 +------------------------------------------------+
		*/
		async function onReaction() {
			const { onReaction } = GoatBot;
			// ✅ FIX: messageID guard — reaction event থেকে messageID না পেলে skip
			if (!messageID) {
				return log.warn("onReaction", "Reaction event received but messageID is undefined — skipping.");
			}
			const Reaction = onReaction.get(messageID);
			if (!Reaction) {
				// No handler registered for this messageID — normal for untracked messages
				return;
			}
			Reaction.delete = () => onReaction.delete(messageID);
			// ✅ FIX: Attach live reaction emoji + userID from event to Reaction object
			Reaction.reaction = event.reaction || "";
			Reaction.userID = event.userID || event.senderID || "";
			Reaction.off = event.off || false;
			const commandName = Reaction.commandName;
			if (!commandName) {
				message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommandName"));
				return log.err("onReaction", `Can't find command name to execute this reaction!`, Reaction);
			}
			const command = GoatBot.commands.get(commandName);
			if (!command) {
				message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "cannotFindCommand", commandName));
				return log.err("onReaction", `Command "${commandName}" not found`, Reaction);
			}

			// ✅ FIX: Ensure userData exists for the REACTING user (may differ from original message sender)
			// The reacting user may not have been in the DB yet — create a minimal record so
			// isBannedOrOnlyAdmin and the log line below never crash on null.
			let reactionUserData = userData;
			if (!reactionUserData && senderID && !isNaN(senderID)) {
				try {
					reactionUserData = await usersData.create(senderID);
				} catch (_) {
					reactionUserData = {
						userID: senderID,
						name: senderID,
						banned: { status: false, reason: "", date: "" },
						data: {},
						settings: {}
					};
				}
			}
			// Sync back so parameters & isBannedOrOnlyAdmin see it
			// (userData is const in outer scope; we shadow it locally here)
			const effectiveUserData = reactionUserData || {
				userID: senderID,
				name: String(senderID),
				banned: { status: false, reason: "", date: "" },
				data: {},
				settings: {}
			};

			// —————————————— CHECK PERMISSION —————————————— //
			const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
			const needRole = roleConfig.onReaction;
			if (needRole > role) {
				if (!hideNotiMessage.needRoleToUseCmdOnReaction) {
					if (needRole == 1)
						return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminToUseOnReaction", commandName));
					else if (needRole == 2)
						return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "onlyAdminBot2ToUseOnReaction", commandName));
				}
				else {
					return true;
				}
			}
			// —————————————————————————————————————————————— //

			const time = getTime("DD/MM/YYYY HH:mm:ss");
			try {
				if (!command)
					throw new Error(`Cannot find command with commandName: ${commandName}`);
				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
				const args = [];
				createMessageSyntaxError(commandName);
				if (isBannedOrOnlyAdmin(effectiveUserData, threadData, senderID, threadID, isGroup, commandName, message, langCode))
					return;
				await command.onReaction({
					...parameters,
					Reaction,
					args,
					commandName,
					getLang: getText2
				});
				log.info("onReaction", `${commandName} | ${effectiveUserData.name || senderID} | ${senderID} | ${threadID} | ${event.reaction}`);
			}
			catch (err) {
				log.err("onReaction", `An error occurred when calling the command onReaction ${commandName}`, err);
				await message.reply(reportCommandError({ err, langKey: "errorOccurred4", commandName, senderID, threadID, time, langCode }));
			}
		}


		/*
		 +------------------------------------------------+
		 |                 EVENT COMMAND                  |
		 +------------------------------------------------+
		*/
		async function handlerEvent() {
			const { author } = event;
			const allEventCommand = GoatBot.eventCommands.entries();
			for (const [key] of allEventCommand) {
				const getEvent = GoatBot.eventCommands.get(key);
				if (!getEvent)
					continue;
				const commandName = getEvent.config.name;
				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, getEvent);
				const time = getTime("DD/MM/YYYY HH:mm:ss");
				try {
					const handler = await getEvent.onStart({
						...parameters,
						commandName,
						getLang: getText2
					});
					if (typeof handler == "function") {
						await handler();
						log.info("EVENT COMMAND", `Event: ${commandName} | ${author} | ${userData.name} | ${threadID}`);
					}
				}
				catch (err) {
					log.err("EVENT COMMAND", `An error occurred when calling the command event ${commandName}`, err);
					await message.reply(reportCommandError({ err, langKey: "errorOccurred5", commandName, senderID, threadID, time, langCode }));
				}
			}
		}


		/*
		 +------------------------------------------------+
		 |                    ON EVENT                    |
		 +------------------------------------------------+
		*/
		async function onEvent() {
			const allOnEvent = GoatBot.onEvent || [];
			const args = [];
			const { author } = event;
			for (const key of allOnEvent) {
				if (typeof key !== "string")
					continue;
				const command = GoatBot.commands.get(key);
				if (!command)
					continue;
				const commandName = command.config.name;
				const time = getTime("DD/MM/YYYY HH:mm:ss");
				createMessageSyntaxError(commandName);

				const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

				if (getType(command.onEvent) == "Function") {
					const defaultOnEvent = command.onEvent;
					// convert to AsyncFunction
					command.onEvent = async function () {
						return defaultOnEvent(...arguments);
					};
				}

				command.onEvent({
					...parameters,
					args,
					commandName,
					getLang: getText2
				})
					.then(async (handler) => {
						if (typeof handler == "function") {
							try {
								await handler();
								log.info("onEvent", `${commandName} | ${author} | ${userData.name} | ${threadID}`);
							}
							catch (err) {
								message.reply(reportCommandError({ err, langKey: "errorOccurred6", commandName, senderID, threadID, time, langCode }));
								log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
							}
						}
					})
					.catch(err => {
						log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
					});
			}
		}

		/*
		 +------------------------------------------------+
		 |                    PRESENCE                    |
		 +------------------------------------------------+
		*/
		async function presence() {
			// Your code here
		}

		/*
		 +------------------------------------------------+
		 |                  READ RECEIPT                  |
		 +------------------------------------------------+
		*/
		async function read_receipt() {
			// Your code here
		}

		/*
		 +------------------------------------------------+
		 |                   		 TYP                    	|
		 +------------------------------------------------+
		*/
		async function typ() {
			// Your code here
		}

		return {
			onAnyEvent,
			onFirstChat,
			onChat,
			onStart,
			onReaction,
			onReply,
			onEvent,
			handlerEvent,
			presence,
			read_receipt,
			typ
		};
	};
};
