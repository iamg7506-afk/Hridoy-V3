"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

const root = path.join(__dirname, "..");
const fcaRoot = path.join(root, "node_modules", "hridoy-ultimate");
if (!fs.existsSync(path.join(fcaRoot, "src", "api"))) {
	test("fcaCompat tests skipped: @eryxenx/fca is not installed (run npm install)", { skip: true }, () => {});
	return;
}
const stubs = require(path.join(__dirname, "helpers/stub-modules"));
if (!process.env.TORU_REAL_DEPS) stubs.install();
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), "bot-fca-")));

const compat = require(path.join(root, "bot/login/fcaCompat.js"));
const fcaFactory = rel => require(path.join(fcaRoot, "src/api", rel));
const noop = () => {};
const silentLog = { info: noop, warn: noop, err: noop };

class FakeMqtt {
	constructor() { this.published = []; this.listeners = []; }
	publish(topic, payload, opts, cb) { this.published.push({ topic, payload: JSON.parse(payload) }); cb && cb(); }
	on(ev, fn) { this.listeners.push([ev, fn]); }
	removeListener() {}
	respondAll() { // answer /ls_resp for every request, like the broker does
		for (const m of this.published) for (const [, fn] of this.listeners)
			fn("/ls_resp", Buffer.from(JSON.stringify({ request_id: m.payload.request_id, payload: "{}" })));
	}
}

function buildApi({ mqtt = new FakeMqtt(), http = {} } = {}) {
	const ctx = {
		userID: "100000000000001", jar: {}, fb_dtsg: "dtsg", lastThreadID: "WRONG_LAST_THREAD",
		mqttClient: mqtt, wsReqNumber: 0, wsTaskNumber: 0, threadTypes: {}, globalOptions: {}
	};
	const defaultFuncs = {
		post: http.post || (async () => ({ data: "{}" })),
		postFormData: http.postFormData || (async () => ({ data: "ok" })),
		get: async () => ({ data: "" })
	};
	const api = {};
	api.addExternalModule = fcaFactory("action/addExternalModule.js")(defaultFuncs, api, ctx);
	api.setMessageReaction = fcaFactory("messaging/setMessageReaction.js")(defaultFuncs, api, ctx);
	api.sendTypingIndicator = fcaFactory("messaging/sendTypingIndicator.js")(defaultFuncs, api, ctx);
	api.setOptions = () => {};
	api.stopListening = cb => cb && cb();
	api.logout = () => Promise.resolve("REAL LOGOUT CALLED");
	return { api, ctx, mqtt, defaultFuncs };
}

test("attach adds the four methods the new FCA lacks, once", () => {
	const { api } = buildApi();
	const r = compat.attach(api, { log: silentLog, config: {} });
	for (const m of ["httpPostFormData", "setActiveStatus", "addFriendRequest", "createCommentPost"]) {
		assert.equal(typeof api[m], "function", m);
		assert.ok(r.added.includes(m), m + " reported as added");
	}
	assert.deepEqual(compat.attach(api, { log: silentLog, config: {} }), { added: [], wrapped: [] }, "second attach is a no-op");
});

test("reaction in the legacy call form goes to the message's own thread, not ctx.lastThreadID", async () => {
	const { api, mqtt } = buildApi();
	compat.attach(api, { log: silentLog, config: {} });
	compat.rememberEvent({ messageID: "mid.A", threadID: "111" });
	compat.rememberEvent({ messageID: "mid.B", threadID: "222" });

	const pA = api.setMessageReaction("😀", "mid.A", () => {}, true);   // exactly how ~270 call sites do it
	const pB = api.setMessageReaction("👍", "mid.B");
	await new Promise(r => setImmediate(r));
	mqtt.respondAll();
	await Promise.all([pA, pB]);

	const threads = mqtt.published.map(m => JSON.parse(JSON.parse(m.payload.payload).tasks[0].payload).thread_key);
	assert.deepEqual(threads, ["111", "222"]);
	assert.ok(!threads.includes("WRONG_LAST_THREAD"));
});

test("unwrapped FCA really would misroute (proves the wrapper is needed)", async () => {
	const { api, mqtt } = buildApi();
	api.setMessageReaction("😀", "mid.A", () => {}, true);
	await new Promise(r => setImmediate(r));
	const tk = JSON.parse(JSON.parse(mqtt.published[0].payload.payload).tasks[0].payload).thread_key;
	assert.equal(tk, "WRONG_LAST_THREAD");
});

test("reaction retries once when MQTT is mid-reconnect", async () => {
	const { api, ctx, mqtt } = buildApi();
	compat.attach(api, { log: silentLog, config: {} });
	compat.rememberEvent({ messageID: "mid.R", threadID: "333" });
	ctx.mqttClient = null;
	setTimeout(() => { ctx.mqttClient = mqtt; }, 300);
	const p = api.setMessageReaction("😀", "mid.R", undefined, true);
	setTimeout(() => mqtt.respondAll(), 2700);
	const res = await p;
	assert.deepEqual(res, { success: true });
	assert.equal(mqtt.published.length, 1);
});

test("typing: old (isTyping, threadID) order is normalised and failures never reject", async () => {
	const { api, ctx, mqtt } = buildApi();
	compat.attach(api, { log: silentLog, config: {} });
	await api.sendTypingIndicator(true, "444");
	const payload = JSON.stringify(mqtt.published[0].payload);
	assert.ok(payload.includes("444"), "thread id reached the publish");
	ctx.mqttClient = null;
	await assert.doesNotReject(() => api.sendTypingIndicator("444", false));
});

test("api.logout is local-only by default and the real one stays reachable", async () => {
	const { api } = buildApi();
	compat.attach(api, { log: silentLog, config: {} });
	assert.deepEqual(await api.logout(), { localOnly: true });
	assert.equal(await api.logoutFromFacebook(), "REAL LOGOUT CALLED");

	const open = buildApi();
	compat.attach(open.api, { log: silentLog, config: { fca: { allowFacebookLogout: true } } });
	assert.equal(await open.api.logout(), "REAL LOGOUT CALLED", "explicit opt-in keeps the original");
});

test("setOptions forwards only keys the FCA knows", () => {
	const { api } = buildApi();
	let seen;
	api.setOptions = o => { seen = o; };
	compat.attach(api, { log: silentLog, config: {} });
	api.setOptions({ selfListen: true, logLevel: "error", enableE2EE: true, listenEvents: true });
	assert.deepEqual(seen, { selfListen: true, listenEvents: true });
});

test("ported graphql methods send the expected mutations and surface Facebook errors", async () => {
	const calls = [];
	const { api } = buildApi({ http: { post: async (url, jar, form) => {
		calls.push(form);
		if (form.fb_api_req_friendly_name === "FriendingCometFriendRequestSendMutation")
			return { data: "for (;;);" + JSON.stringify({ data: { friend_request_send: { friend_requestees: [{ id: "55", friendship_status: "OUTGOING_REQUEST" }] } } }) };
		if (form.fb_api_req_friendly_name === "UpdatePresenceSettingsMutation")
			return { data: JSON.stringify({ errors: [{ message: "nope" }] }) };
		return { data: JSON.stringify({ data: { comment_create: { feedback_comment_edge: { node: { id: "c1", feedback: { url: "https://fb/x" } } }, feedback: { total_comment_count: 3 } } } }) };
	} } });
	compat.attach(api, { log: silentLog, config: {} });

	assert.deepEqual(await api.addFriendRequest("55"), { userID: "55", friendshipStatus: "OUTGOING_REQUEST", success: true });
	await assert.rejects(() => api.setActiveStatus(true));
	await assert.rejects(() => api.setActiveStatus("yes"));
	assert.deepEqual(await api.createCommentPost("hello", "999"), { id: "c1", url: "https://fb/x", count: 3 });
	await assert.rejects(() => api.createCommentPost("hello", 999), "non-string postID rejects instead of resolving with an error object");
	const comment = calls.find(f => f.fb_api_req_friendly_name === "useCometUFICreateCommentMutation");
	assert.equal(JSON.parse(comment.variables).input.message.text, "hello");
});

test("httpPostFormData returns the raw string like the old FCA (post.js JSON.parses it)", async () => {
	const { api } = buildApi({ http: { postFormData: async () => ({ data: "for (;;);{\"payload\":{\"fbid\":\"7\"}}" }) } });
	compat.attach(api, { log: silentLog, config: {} });
	const out = await api.httpPostFormData("https://www.facebook.com/x", { file: "f" });
	assert.equal(typeof out, "string");
	assert.equal(JSON.parse(out.replace("for (;;);", "")).payload.fbid, "7");
});

test("thread map is bounded", () => {
	for (let i = 0; i < 4500; i++) compat.remember("m" + i, "t" + i);
	assert.equal(compat.lookupThread("m0"), null, "oldest evicted");
	assert.equal(compat.lookupThread("m4499"), "t4499");
});

test("only the benign puback warning is hidden; real warnings pass through", () => {
	const seen = [];
	const orig = process.stderr.write;
	process.stderr.write = (c, ...r) => { seen.push(String(c)); const cb = r.find(x => typeof x === "function"); if (cb) cb(); return true; };
	try {
		delete process.stderr.__fcaBenignMuted;
		compat.muteBenignFcaWarnings();
		let cbCalled = false;
		process.stderr.write("\r[ FCA-WARN ] > mqtt puback ignored: Invalid header flag bits, must be 0x0 for puback packet\n", () => { cbCalled = true; });
		process.stderr.write("\r[ FCA-WARN ] > something else\n");
		assert.ok(cbCalled, "write callback still fires");
		assert.equal(seen.length, 1);
		assert.match(seen[0], /something else/);
		assert.ok(compat.benignWarningsHidden() >= 1);
	} finally { process.stderr.write = orig; }
});
