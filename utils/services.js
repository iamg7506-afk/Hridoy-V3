"use strict";
/** Starts every optional "pro" service once, after commands are loaded. Idempotent. */
module.exports.start = function (current) {
	const ctx = (global.GoatBot._svc = global.GoatBot._svc || { current: null });
	ctx.current = current; // always the newest api/models
	const run = (name, fn) => { try { fn(); } catch (e) { console.log(`[SERVICES] ${name} failed to start: ${e.message}`); } };
	run("reminders", () => require("./reminderService.js").start({ api: current.api, usersData: current.usersData }));
	run("autoBackup", () => require("./autoBackup.js").start());
	run("hotReload", () => require("./hotReload.js").start(ctx));
	run("bridge", () => require("./bridge.js").start(ctx));
	global.GoatBot.notify = (t) => require("./bridge.js").notify(t);
};
