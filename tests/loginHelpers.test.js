"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const root = path.join(__dirname, "..");
const { classifyListenError, createBackoff, nextRefreshDelay } = require(path.join(root, "bot/login/listenSupervisor.js"));
const { loadAppState } = require(path.join(root, "bot/login/appStateLoader.js"));
const { buildFcaOptions } = require(path.join(root, "bot/login/fcaOptions.js"));

test("control events from the new FCA are not treated as failures", () => {
	assert.equal(classifyListenError({ type: "ready", error: null }).kind, "ready");
	assert.equal(classifyListenError("Connection closed.").kind, "closed");
	assert.equal(classifyListenError({ type: "account_inactive", reason: "not_logged_in", error: "Not logged in" }).kind, "auth");
	assert.equal(classifyListenError({ type: "stop_listen", error: "mqtt reconnect attempts exhausted (x)" }).kind, "exhausted");
	assert.equal(classifyListenError({ type: "stop_listen", error: "login_blocked checkpoint" }).kind, "auth");
	assert.equal(classifyListenError({ error: "Connection refused: Server unavailable" }).kind, "transient");
	assert.equal(classifyListenError({ error: "something odd" }).kind, "other");
});

test("backoff is bounded and resets", () => {
	const b = createBackoff({ baseMs: 1000, maxMs: 4000, maxAttempts: 4, jitter: 0 });
	assert.deepEqual([b.next(), b.next(), b.next(), b.next(), b.next()], [1000, 2000, 4000, 4000, null]);
	b.reset();
	assert.equal(b.next(), 1000);
});

test("periodic refresh is jittered, never exact", () => {
	const set = new Set(Array.from({ length: 30 }, () => nextRefreshDelay(900000)));
	assert.ok(set.size > 5);
	for (const v of set) assert.ok(v >= 765000 && v <= 1035000);
});

function tmp(content) { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "acc-")), "account.txt"); fs.writeFileSync(f, content); return f; }

test("cookie file: json array is returned untouched and the file is never modified", () => {
	const text = JSON.stringify([{ key: "c_user", value: "1" }, { key: "xs", value: "a" }, { key: "datr", value: "d" }]);
	const f = tmp(text);
	const mtime = fs.statSync(f).mtimeMs;
	const r = loadAppState(f);
	assert.ok(r.ok); assert.equal(r.format, "json"); assert.equal(r.cookies.length, 3);
	assert.equal(fs.readFileSync(f, "utf8"), text); assert.equal(fs.statSync(f).mtimeMs, mtime);
});

test("cookie file: cookie string, netscape, and bad input", () => {
	assert.equal(loadAppState(tmp("c_user=1; xs=abc; datr=z")).format, "cookie-string");
	const net = ".facebook.com\tTRUE\t/\tTRUE\t1999999999\tc_user\t1\n.facebook.com\tTRUE\t/\tTRUE\t1999999999\txs\tabc";
	const r = loadAppState(tmp(net));
	assert.ok(r.ok); assert.equal(r.format, "netscape");
	assert.equal(loadAppState(tmp("")).ok, false);
	assert.match(loadAppState(tmp("[{\"key\":\"datr\",\"value\":\"1\"}]")).reason, /c_user/);
	assert.equal(loadAppState(tmp("hello world")).ok, false);
	assert.equal(loadAppState("/nonexistent/account.txt").ok, false);
});

test("fca options: only known keys, stock Android UA is never forwarded", () => {
	const cfg = {
		facebookAccount: { userAgent: "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 Chrome/101.0.0.0 Mobile Safari/537.36", proxy: null },
		optionsFca: { forceLogin: false, listenEvents: true, updatePresence: false, logLevel: "error", enableE2EE: true, reactionDebug: false, autoMarkDelivery: false, notes: "x", _fixNote: "y" }
	};
	const r = buildFcaOptions(cfg);
	assert.deepEqual(Object.keys(r.options).sort(), ["forceLogin", "listenEvents", "updatePresence"]);
	assert.equal(r.userAgentSource, "fca-default");
	assert.deepEqual(r.dropped.sort(), ["autoMarkDelivery", "enableE2EE", "logLevel", "reactionDebug"]);
	cfg.facebookAccount.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/149.0.0.0 Safari/537.36";
	assert.equal(buildFcaOptions(cfg).options.userAgent, cfg.facebookAccount.userAgent);
});
