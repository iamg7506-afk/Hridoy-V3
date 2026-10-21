"use strict";
/** Watches scripts/cmds + scripts/events; add/edit/delete = live (un)load, no restart. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const watchers = [];
const timers = new Map();
let started = false;

function stub(key, a, b, c) { return [key, a, b, c].filter(x => x !== undefined).join(" "); }

function syntaxOk(file) {
	try { new vm.Script("(function(exports,require,module,__filename,__dirname){" + fs.readFileSync(file, "utf8") + "\n})", { filename: file }); return null; }
	catch (e) { return e.message; }
}

function apply(ctx, folder, fileName) {
	const { log } = global.utils;
	const full = path.join(process.cwd(), "scripts", folder, fileName);
	const name = fileName.replace(/\.js$/, "");
	const cc = global.GoatBot.configCommands;
	try {
		if (!fs.existsSync(full)) {
			const r = global.utils.unloadScripts(folder, name, cc, stub);
			if (r && r.status === "success") log.master("HOT RELOAD", `unloaded ${folder}/${fileName}`);
			return;
		}
		const bad = syntaxOk(full);
		if (bad) return log.warn("HOT RELOAD", `${folder}/${fileName} has a syntax error, keeping the old version: ${bad}`);
		const r = global.utils.loadScripts(folder, name, log, cc, ctx.api, ctx.threadModel, ctx.userModel, ctx.dashBoardModel, ctx.globalModel, ctx.threadsData, ctx.usersData, ctx.dashBoardData, ctx.globalData, stub);
		if (r && r.status === "success") log.master("HOT RELOAD", `${folder}/${fileName} live (${r.command && r.command.config ? "v" + (r.command.config.version || "?") : "ok"})`);
		else log.warn("HOT RELOAD", `${folder}/${fileName} failed: ${r && r.error ? r.error.message : "unknown"}`);
	} catch (e) { log.warn("HOT RELOAD", `${folder}/${fileName}: ${e.message}`); }
}

function start(ctx) {
	const c = global.GoatBot.config.hotReload || {};
	if (!c.enable || started) return started;
	if (global.GoatBot.config.autoLoadScripts && global.GoatBot.config.autoLoadScripts.enable) {
		global.utils.log.info("HOT RELOAD", "autoLoadScripts is on (stock watcher); skipping to avoid double loading");
		return false;
	}
	started = true;
	for (const folder of ["cmds", "events"]) {
		const dir = path.join(process.cwd(), "scripts", folder);
		try {
			watchers.push(fs.watch(dir, (ev, f) => {
				if (!f || !f.endsWith(".js") || f.startsWith(".") || f.includes("~")) return;
				const key = folder + "/" + f;
				clearTimeout(timers.get(key));
				timers.set(key, setTimeout(() => { timers.delete(key); apply(ctx.current, folder, f); }, c.debounceMs || 800));
			}));
		} catch (e) { global.utils.log.warn("HOT RELOAD", `cannot watch ${dir}: ${e.message}`); }
	}
	return true;
}

module.exports = { start, syntaxOk, apply };
