"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");

// axios is replaced at the module boundary so no network is touched.
let calls = [];
let reply = () => ({ status: 200, data: "" });
const origLoad = Module._load;
Module._load = function (request, ...rest) {
	if (request === "axios") return async (opts) => { calls.push(opts); return reply(opts); };
	return origLoad.call(this, request, ...rest);
};
const check = require(path.join(__dirname, "..", "bot/login/checkLiveCookie.js"));
Module._load = origLoad;

test("cookie check: no userAgent configured -> skipped, nothing sent to Facebook", async () => {
	calls = [];
	assert.equal(await check("c_user=1; xs=2", ""), true);
	assert.equal(calls.length, 0);
});

test("cookie check: sends only the configured UA, no invented client hints", async () => {
	calls = [];
	reply = () => ({ status: 200, data: '<a href="/notifications.php?x">' });
	assert.equal(await check("c_user=1; xs=2", "Mozilla/5.0 TestUA"), true);
	assert.equal(calls[0].headers["user-agent"], "Mozilla/5.0 TestUA");
	assert.equal(Object.keys(calls[0].headers).some(k => k.startsWith("sec-ch-")), false);
});

test("cookie check: network error is unknown, not invalid", async () => {
	reply = () => { throw new Error("ECONNRESET"); };
	assert.equal(await check("c_user=1", "UA"), true);
});

test("cookie check: only a real login page means invalid", async () => {
	reply = () => ({ status: 200, data: '<form id="login_form" action="/login/device-based/regular/login/">' });
	assert.equal(await check("c_user=1", "UA"), false);
});
