"use strict";
/**
 * fcaCompat — the only place where GoatBot code and @eryxenx/fca 1.1.x meet.
 *
 * The FCA is the unmodified npm package @eryxenx/fca (no local copy, nothing in it is edited).
 * Everything the bot needs beyond the stock API is attached here, after login,
 * through the FCA's own api.addExternalModule() hook or by wrapping a method.
 *
 *  1. Missing methods the bot's commands call (ported from the old toru-fca):
 *       httpPostFormData, setActiveStatus, addFriendRequest, createCommentPost
 *  2. sendTypingIndicator: accepts the old (isTyping, threadID) order too, and
 *     never rejects (typing is cosmetic).
 *  3. setMessageReaction: ~270 bot call sites use the legacy
 *     (emoji, messageID, callback, force) form without a thread id. The FCA then
 *     falls back to ctx.lastThreadID = "thread of the most recent event", which
 *     reacts in the WRONG group when two groups are active. We resolve the real
 *     thread from a bounded messageID -> threadID map and retry once when the
 *     MQTT socket is mid-reconnect.
 *  4. setOptions: drops keys the FCA does not know instead of warning each time.
 *  5. logout: api.logout() in this FCA POSTs facebook.com/logout.php, which ends
 *     the session in your BROWSER too. It is turned into a local stop (listener,
 *     timers) unless config.fca.allowFacebookLogout === true. The real one stays
 *     available as api.logoutFromFacebook().
 */

const crypto = require("crypto");
const { FCA_OPTION_KEYS } = require("./fcaOptions");

// ───────────────────────── messageID -> threadID map ─────────────────────────
const MAX_REMEMBERED = 4000;
const threadOfMessage = new Map();

function remember(messageID, threadID) {
	if (!messageID || !threadID) return;
	const k = String(messageID);
	if (threadOfMessage.has(k)) threadOfMessage.delete(k);
	threadOfMessage.set(k, String(threadID));
	if (threadOfMessage.size > MAX_REMEMBERED) {
		const first = threadOfMessage.keys().next().value;
		threadOfMessage.delete(first);
	}
}

/** Call for every event the listener delivers. */
function rememberEvent(event) {
	if (event && event.messageID && event.threadID) remember(event.messageID, event.threadID);
}

const lookupThread = messageID => threadOfMessage.get(String(messageID)) || null;

// ───────────────────────────── helpers ─────────────────────────────
function parseFb(data) {
	if (data && typeof data === "object" && !Buffer.isBuffer(data)) return data;
	let s = Buffer.isBuffer(data) ? data.toString("utf8") : String(data == null ? "" : data);
	s = s.replace(/^for \(;;\);/, "").trim();
	if (!s) return null;
	try { return JSON.parse(s); }
	catch (_) {
		for (const line of s.split("\n")) {
			try { return JSON.parse(line); } catch (__) { /* next line */ }
		}
	}
	return null;
}

/** Promise + optional node-style callback; the callback owns the error. */
function settle(promise, callback) {
	if (typeof callback === "function") {
		promise.then(r => callback(null, r), e => callback(e));
		return promise.catch(() => undefined);
	}
	return promise;
}

const isStream = x => !!x && typeof x.pipe === "function";

async function graphql(defaultFuncs, ctx, friendlyName, docId, variables, extra) {
	const form = Object.assign({
		fb_api_caller_class: "RelayModern",
		fb_api_req_friendly_name: friendlyName,
		variables: JSON.stringify(variables),
		server_timestamps: true,
		doc_id: docId
	}, ctx.fb_dtsg ? { lsd: ctx.fb_dtsg } : {}, extra || {});
	const res = await defaultFuncs.post("https://www.facebook.com/api/graphql/", ctx.jar, form);
	const body = parseFb(res && res.data);
	if (!body) throw new Error(`${friendlyName}: empty or unreadable response`);
	if (body.error || (Array.isArray(body.errors) && body.errors.length)) {
		const err = new Error(`${friendlyName}: Facebook returned an error`);
		err.response = body;
		throw err;
	}
	return body;
}

// ─────────────────── ported methods (factories for addExternalModule) ───────────────────
const externalModules = {
	// old: httpPostFormData(url, form, customHeader?, callback?, notAPI?) -> raw response string
	httpPostFormData: (defaultFuncs, api, ctx) => function httpPostFormData(url, form, customHeader, callback) {
		if (typeof form === "function") { callback = form; form = {}; }
		if (typeof customHeader === "function") { callback = customHeader; customHeader = {}; }
		const p = defaultFuncs.postFormData(url, ctx.jar, form || {}, {}).then(res => {
			const d = res && (res.data !== undefined ? res.data : res.body);
			return typeof d === "string" ? d : Buffer.isBuffer(d) ? d.toString("utf8") : JSON.stringify(d);
		});
		return settle(p, callback);
	},

	// Explicit user command only (activestatus / setting). Never called on boot by default.
	setActiveStatus: (defaultFuncs, api, ctx) => function setActiveStatus(isActive, callback) {
		if (typeof isActive !== "boolean")
			return settle(Promise.reject({ error: "isActive must be a boolean value" }), callback);
		const p = graphql(defaultFuncs, ctx, "UpdatePresenceSettingsMutation", "9444355898946246", {
			input: {
				online_policy: "ALLOWLIST",
				web_allowlist: [],
				web_visibility: isActive,
				actor_id: String(ctx.userID),
				client_mutation_id: "1"
			}
		}).then(() => ({ success: true, activeStatus: isActive }));
		return settle(p, callback);
	},

	// The bot's friendrequest command calls addFriendRequest (the old FCA only had sendFriendRequest).
	addFriendRequest: (defaultFuncs, api, ctx) => function addFriendRequest(userID, callback) {
		if (!userID) return settle(Promise.reject({ error: "User ID is required" }), callback);
		const p = graphql(defaultFuncs, ctx, "FriendingCometFriendRequestSendMutation", "24614631718227645", {
			input: {
				click_correlation_id: Date.now().toString(),
				click_proof_validation_result: "{\"validated\":true}",
				friend_requestee_ids: [String(userID)],
				friending_channel: "FRIENDS_HOME_MAIN",
				warn_ack_for_ids: [],
				actor_id: String(ctx.userID),
				client_mutation_id: Math.floor(Math.random() * 10).toString()
			},
			scale: 1
		}, { __crn: "comet.fbweb.CometFriendingRoute" }).then(body => {
			const sent = body.data && body.data.friend_request_send;
			const who = sent && sent.friend_requestees && sent.friend_requestees[0];
			if (!who) throw { error: "No friend request data received" };
			return { userID: who.id, friendshipStatus: who.friendship_status, success: who.friendship_status === "OUTGOING_REQUEST" };
		});
		return settle(p, callback);
	},

	// Same behaviour as the old createCommentPost, minus its two bugs
	// (undefined "calback" variable; errors delivered as a *successful* result).
	createCommentPost: (defaultFuncs, api, ctx) => function createCommentPost(msg, postID, callback, replyCommentID) {
		if (typeof callback === "string") { replyCommentID = callback; callback = null; }
		const fail = e => settle(Promise.reject(e), callback);

		if (typeof msg === "string") msg = { body: msg };
		if (!msg || typeof msg !== "object") return fail("Message must be a string or object");
		if (typeof postID !== "string") return fail("postID must be a string");
		msg = Object.assign({ body: "" }, msg);
		const mentions = msg.mentions ? [].concat(msg.mentions) : [];
		const attachments = msg.attachments ? [].concat(msg.attachments) : [];
		if (typeof msg.body === "object") msg.body = JSON.stringify(msg.body);
		if (typeof replyCommentID !== "string") replyCommentID = null;

		const form = {
			feedLocation: "NEWSFEED",
			feedbackSource: 1,
			groupID: null,
			input: {
				client_mutation_id: Math.round(Math.random() * 19).toString(),
				actor_id: ctx.userID,
				attachments: [],
				feedback_id: Buffer.from("feedback:" + postID).toString("base64"),
				formatting_style: null,
				message: { ranges: [], text: msg.body },
				reply_comment_parent_fbid: replyCommentID
					? (isNaN(replyCommentID) ? replyCommentID : Buffer.from("comment:" + postID + "_" + replyCommentID).toString("base64"))
					: null,
				reply_target_clicked: !!replyCommentID,
				attribution_id_v2: "CometHomeRoot.react,comet.home,via_cold_start," + Date.now() + ",156248,4748854339,,",
				vod_video_timestamp: null,
				feedback_referrer: "/",
				is_tracking_encrypted: true,
				tracking: [],
				feedback_source: "NEWS_FEED",
				idempotence_token: "client:" + crypto.randomUUID(),
				session_id: crypto.randomUUID()
			},
			inviteShortLinkKey: null,
			renderLocation: null,
			scale: 1,
			useDefaultActor: false,
			focusCommentID: null
		};

		const run = async () => {
			for (const item of attachments) {
				if (!isStream(item)) throw { error: "attachments must be readable streams" };
				const res = await defaultFuncs.postFormData("https://www.facebook.com/ajax/ufi/upload/", ctx.jar, {
					profile_id: ctx.userID, source: 19, target_id: ctx.userID, file: item
				}, {});
				const body = parseFb(res && res.data);
				if (!body || body.errors || body.error || !body.payload) throw body || { error: "upload failed" };
				form.input.attachments.push({ media: { id: body.payload.fbid } });
			}
			if (typeof msg.url === "string")
				form.input.attachments = [{ link: { external: { url: msg.url } } }];
			for (const m of mentions) {
				if (typeof m.tag !== "string") throw { error: "Mention tag must be string" };
				if (!m.id) throw { error: "Mention id is required" };
				const offset = msg.body.indexOf(m.tag, m.fromIndex || 0);
				if (offset < 0) throw { error: `Mention for "${m.tag}" not found in message string.` };
				form.input.message.ranges.push({ entity: { id: m.id }, length: m.tag.length, offset });
			}
			if (msg.sticker && !isNaN(msg.sticker))
				form.input.attachments = [{ media: { id: msg.sticker } }];

			const body = await graphql(defaultFuncs, ctx, "useCometUFICreateCommentMutation", 6993516810709754, form);
			const created = body.data && body.data.comment_create;
			const node = created && created.feedback_comment_edge && created.feedback_comment_edge.node;
			if (!node) throw { error: "Comment was not created", response: body };
			return {
				id: node.id,
				url: node.feedback && node.feedback.url,
				count: created.feedback && created.feedback.total_comment_count
			};
		};
		return settle(run(), callback);
	}
};

// The FCA prints "mqtt puback ignored: Invalid header flag bits" for (nearly) every message: the broker's
// ack has a non-standard flag byte that the MQTT library tolerates. It is harmless and drowns the log, so
// exactly that line is dropped; a count is kept in compat.benignWarningsHidden().
let hiddenBenign = 0;
function muteBenignFcaWarnings() {
	if (process.stderr.__fcaBenignMuted) return;
	process.stderr.__fcaBenignMuted = true;
	const realWrite = process.stderr.write.bind(process.stderr);
	process.stderr.write = function (chunk, ...rest) {
		const text = typeof chunk === "string" ? chunk : (chunk && chunk.toString ? chunk.toString() : "");
		if (text.includes("mqtt puback ignored: Invalid header flag bits")) {
			hiddenBenign++;
			const cb = rest.find(x => typeof x === "function");
			if (cb) cb();
			return true;
		}
		return realWrite(chunk, ...rest);
	};
}

// ───────────────────────────────── attach ─────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * @param {object} api   the object returned by the FCA login
 * @param {{log?: object, config?: object}} deps
 * @returns {{added: string[], wrapped: string[]}}
 */
function attach(api, deps) {
	const log = (deps && deps.log) || { info() {}, warn() {}, err() {} };
	const config = (deps && deps.config) || {};
	const added = [];
	const wrapped = [];
	if (api.__fcaCompatAttached) return { added, wrapped };
	api.__fcaCompatAttached = true;
	muteBenignFcaWarnings();

	// 1. missing methods
	for (const name of Object.keys(externalModules)) {
		if (typeof api[name] === "function") continue;
		if (typeof api.addExternalModule !== "function") {
			log.warn("FCA COMPAT", `api.addExternalModule is missing; cannot add ${name}`);
			continue;
		}
		try {
			api.addExternalModule({ [name]: externalModules[name] });
			added.push(name);
		}
		catch (e) {
			log.warn("FCA COMPAT", `could not add ${name}: ${e && e.message || e}`);
		}
	}

	// 2. sendTypingIndicator: tolerate old (isTyping, threadID) order, never reject
	if (typeof api.sendTypingIndicator === "function") {
		const origTyping = api.sendTypingIndicator;
		api.sendTypingIndicator = function (a, b, c, d) {
			if (typeof a === "boolean") { const t = a; a = b; b = t; }
			// The FCA's own auto-stop timer publishes on ctx.mqttClient without a guard and throws
			// if the socket dropped meanwhile (e.g. during a listener refresh). Do the auto-stop here, guarded.
			let opts = typeof c === "object" && c ? c : (typeof d === "object" && d ? d : null);
			let stopAfter = 0;
			if (b === true && !(opts && opts.autoStop === false)) {
				stopAfter = (opts && opts.duration) || 10000;
				const merged = Object.assign({}, opts || {}, { autoStop: false });
				if (typeof c === "object" || c == null) c = merged; else d = merged;
			}
			const hasCb = typeof c === "function" || typeof d === "function";
			let p;
			try { p = origTyping.call(api, a, b, c, d); }
			catch (_) { return undefined; }
			if (stopAfter) {
				const t = setTimeout(() => {
					try {
						const r = origTyping.call(api, a, false, { autoStop: false });
						if (r && typeof r.catch === "function") r.catch(() => {});
					} catch (_) { /* socket gone: nothing to stop */ }
				}, stopAfter);
				if (t.unref) t.unref();
			}
			return hasCb || !p || typeof p.then !== "function" ? p : p.catch(() => undefined);
		};
		wrapped.push("sendTypingIndicator");
	}

	// 3. setMessageReaction: real thread instead of ctx.lastThreadID, one retry mid-reconnect
	if (typeof api.setMessageReaction === "function") {
		const origReact = api.setMessageReaction;
		api.setMessageReaction = function (reaction, messageID, threadID, callback, force) {
			let cb, forceFlag, tid = threadID;
			if (typeof threadID === "function") { cb = threadID; forceFlag = callback; tid = null; }
			else if (typeof threadID === "boolean") { forceFlag = threadID; tid = null; }
			else { cb = callback; forceFlag = force; }
			if (typeof cb === "boolean") { forceFlag = cb; cb = undefined; }
			if (typeof cb !== "function") cb = undefined;
			if (!tid) tid = lookupThread(messageID);

			if (!tid) return origReact.apply(api, arguments); // unknown message: FCA's own resolution

			const attempt = () => origReact.call(api, reaction, messageID, tid, undefined, forceFlag);
			const p = attempt().catch(async err => {
				if (err && /MQTT client not connected/i.test(err.message || "")) {
					await wait(2500);
					return attempt();
				}
				throw err;
			});
			if (cb) {
				p.then(r => cb(null, r), e => cb(e));
				return p.catch(() => undefined);
			}
			return p;
		};
		wrapped.push("setMessageReaction");
	}

	// 4. setOptions: only keys the FCA knows
	if (typeof api.setOptions === "function") {
		const origSet = api.setOptions;
		api.setOptions = function (opts) {
			const filtered = {};
			for (const k of Object.keys(opts || {})) if (FCA_OPTION_KEYS.includes(k)) filtered[k] = opts[k];
			return origSet.call(api, filtered);
		};
		wrapped.push("setOptions");
	}

	// 5. logout: local stop only, unless explicitly allowed
	if (typeof api.logout === "function" && !(config.fca && config.fca.allowFacebookLogout === true)) {
		api.logoutFromFacebook = api.logout;
		api.logout = function (callback) {
			log.warn("FCA COMPAT", "api.logout() blocked: it would end your Facebook browser session. Stopping the listener locally instead.");
			const p = new Promise(resolve => {
				if (typeof api.stopListening === "function") api.stopListening(() => resolve({ localOnly: true }));
				else resolve({ localOnly: true });
			});
			return settle(p, callback);
		};
		wrapped.push("logout");
	}

	return { added, wrapped };
}

module.exports = { attach, muteBenignFcaWarnings, benignWarningsHidden: () => hiddenBenign, rememberEvent, remember, lookupThread, parseFb, externalModules };
