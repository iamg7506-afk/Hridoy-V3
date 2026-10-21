"use strict";
const test = require("node:test"), assert = require("node:assert");
const R = require("../utils/reminderService.js"), RL = require("../utils/rateLimiter.js"), GS = require("../utils/groupSettings.js"), B = require("../utils/autoBackup.js");
const TZ = "Asia/Dhaka", now = new Date("2026-10-16T10:00:00Z"); // 16:00 in Dhaka
const hm = (d) => { const p = R.zonedParts(d, TZ); return `${p.y}-${p.mo}-${p.d} ${p.h}:${String(p.mi).padStart(2, "0")}`; };

test("reminder: kal 9tay", () => { const r = R.parseReminder("kal 9tay assignment dite hobe", now, TZ); assert.ok(r.ok); assert.equal(hm(r.at), "2026-10-17 9:00"); assert.equal(r.text, "assignment dite hobe"); });
test("reminder: relative", () => { const r = R.parseReminder("10 minute pore chai khabo", now, TZ); assert.ok(r.ok); assert.equal(r.at - now, 600000); assert.equal(r.text, "chai khabo"); });
test("reminder: english relative", () => { const r = R.parseReminder("in 2 hours call mom", now, TZ); assert.equal(r.at - now, 7200000); assert.equal(r.text, "call mom"); });
test("reminder: aj rat 11:30", () => { const r = R.parseReminder("aj rat 11:30 ghumabo", now, TZ); assert.equal(hm(r.at), "2026-10-16 23:30"); });
test("reminder: date + pm", () => { const r = R.parseReminder("25/12 8:30pm birthday wish", now, TZ); assert.equal(hm(r.at), "2026-12-25 20:30"); });
test("reminder: daily repeat", () => { const r = R.parseReminder("protidin 8am water kheyo", now, TZ); assert.equal(r.repeat, "daily"); assert.equal(hm(r.at), "2026-10-17 8:00"); });
test("reminder: no time = error", () => assert.equal(R.parseReminder("hello world", now, TZ).ok, false));

test("rate limit: blocks after max, admin bypass", () => {
	RL.reset(); const c = { enable: true, ignoreAdmin: true, notify: true, default: { maxUses: 2, perSeconds: 10 }, perCommand: {} };
	assert.ok(RL.check("x", "u1", false, 1000, c).allowed); assert.ok(RL.check("x", "u1", false, 2000, c).allowed);
	const b = RL.check("x", "u1", false, 3000, c); assert.equal(b.allowed, false); assert.ok(b.notify); assert.equal(RL.check("x", "u1", false, 4000, c).notify, false);
	assert.ok(RL.check("x", "admin", true, 3000, c).allowed); assert.ok(RL.check("x", "u1", false, 20000, c).allowed);
});
test("group settings", () => {
	assert.deepEqual(GS.toggled(["a"], "B", true), ["a", "b"]);
	assert.ok(GS.isCommandDisabled({ data: { disabledCommands: ["ping"] } }, "ping")); assert.equal(GS.isCommandDisabled({ data: { disabledCommands: ["gset"] } }, "gset"), false);
});
test("backup redaction", () => { const o = B.redact({ database: { uriMongodb: "mongo"+"db://user:pw@host" }, prefix: "/", notes: "token here" }); assert.equal(o.database.uriMongodb, "[REDACTED]"); assert.equal(o.prefix, "/"); assert.equal(o.notes, "token here"); });
