"use strict";
/**
 * Reminder service: parser + persistent scheduler.
 *
 * Understands Banglish and English, e.g.
 *   kal 9tay assignment dite hobe
 *   10 minute pore chai khabo
 *   aj rat 11:30 ghumabo
 *   porshu sokal 7 tay ticket kinbo
 *   25/12 8:30pm birthday wish
 *   protidin 8am water kheyo        (daily repeat)
 *   in 2 hours call mom
 *
 * Data: data/reminders.json (atomic writes, survives restarts).
 * Dependency-free on purpose (only Intl for time zones) so it is unit-testable.
 */

const fs = require("fs");
const path = require("path");
const { writeJsonAtomicSync } = require("./atomicJson.js");

const FILE = path.join(process.cwd(), "data", "reminders.json");

/* ------------------------------------------------------------------ */
/*  time zone helpers (no moment needed)                              */
/* ------------------------------------------------------------------ */

function zonedParts(date, tz) {
	const f = new Intl.DateTimeFormat("en-US", {
		timeZone: tz, hourCycle: "h23",
		year: "numeric", month: "numeric", day: "numeric",
		hour: "numeric", minute: "numeric", second: "numeric"
	});
	const o = {};
	for (const p of f.formatToParts(date)) if (p.type !== "literal") o[p.type] = Number(p.value);
	return { y: o.year, mo: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
}

/** Wall-clock time in `tz` -> real Date (handles DST by one correction pass). */
function zonedToDate(y, mo, d, h, mi, tz) {
	let guess = Date.UTC(y, mo - 1, d, h, mi, 0);
	for (let i = 0; i < 2; i++) {
		const p = zonedParts(new Date(guess), tz);
		const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, 0);
		guess -= asUtc - Date.UTC(y, mo - 1, d, h, mi, 0);
	}
	return new Date(guess);
}

function addDays(y, mo, d, n) {
	const t = new Date(Date.UTC(y, mo - 1, d + n));
	return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/* ------------------------------------------------------------------ */
/*  parser                                                            */
/* ------------------------------------------------------------------ */

const UNIT = [
	[/^(?:sec|secs|second|seconds|sekend|sekond|s)$/i, 1000],
	[/^(?:min|mins|minute|minutes|minit|minut|m)$/i, 60 * 1000],
	[/^(?:h|hr|hrs|hour|hours|ghonta|ghanta|ghonte|ghontay|ghontar)$/i, 3600 * 1000],
	[/^(?:d|day|days|din|diner)$/i, 86400 * 1000]
];

const FILLER = /\b(?:remind(?:er)?(?:\s+me)?|remind\s+koro|reminder\s+koro|mone\s+koriye\s+dio|mone\s+koriye|moneKoriye|koro|korio|dio|please|plz|pls|to|ke|ami|amake|me|set)\b/gi;

function periodOf(word) {
	if (!word) return null;
	const w = word.toLowerCase();
	if (/^(?:sokal|shokal|bhor|vor|morning|am|a\.m\.?)$/.test(w)) return "am";
	if (/^(?:dupur|dupure|dupurer|noon|bikel|bikal|bikele|afternoon|sondha|shondha|sandhya|evening|pm|p\.m\.?)$/.test(w)) return "pm";
	if (/^(?:rat|raat|raate|night)$/.test(w)) return "night";
	return null;
}

/**
 * @param {string} input   text after the command name
 * @param {Date}   now
 * @param {string} tz      IANA zone, e.g. Asia/Dhaka
 * @returns {{ok:true, at:Date, text:string, repeat:null|"daily"|"weekly"} | {ok:false, error:string}}
 */
function parseReminder(input, now = new Date(), tz = "Asia/Dhaka") {
	let s = " " + String(input || "").replace(/\s+/g, " ").trim() + " ";
	if (!s.trim()) return { ok: false, error: "empty" };

	let repeat = null;
	if (/\s(?:protidin|prottoho|everyday|every\s+day|daily|roj|rojkar)\s/i.test(s)) { repeat = "daily"; s = s.replace(/\s(?:protidin|prottoho|everyday|every\s+day|daily|roj|rojkar)\s/i, " "); }
	else if (/\s(?:protisaptahe|prottek\s+shoptaha|weekly|every\s+week|protibar)\s/i.test(s)) { repeat = "weekly"; s = s.replace(/\s(?:protisaptahe|prottek\s+shoptaha|weekly|every\s+week|protibar)\s/i, " "); }

	/* ---- 1. relative: "10 minute pore", "in 2 hours", "2 ghonta por" ---- */
	const rel = s.match(/\s(?:in\s+)?(\d+(?:\.\d+)?)\s*(secs?|seconds?|sekend|sekond|mins?|minutes?|minit|minut|hrs?|hours?|ghont[ae]y?|ghonta|ghanta|days?|din|[smhd])\s*(?:pore|por|later|after|e|moddhe)?\s/i);
	if (rel && !/\d\s*:\s*\d/.test(rel[0]) && !/(?:tay|ta|am|pm)\b/i.test(rel[2])) {
		const n = parseFloat(rel[1]);
		const unitWord = rel[2];
		const unit = UNIT.find(([re]) => re.test(unitWord));
		// plain single letters need the explicit "in"/"pore" to avoid eating times like "9 m"
		const single = /^[smhd]$/i.test(unitWord);
		const hasHint = /\bin\s/i.test(rel[0]) || /(?:pore|por|later|after|moddhe)/i.test(rel[0]);
		if (unit && (!single || hasHint)) {
			const at = new Date(now.getTime() + n * unit[1]);
			const text = clean(s.replace(rel[0], " "));
			return finish(at, text, repeat, now);
		}
	}

	/* ---- 2. day ---- */
	let dayOffset = null; // days from today (in tz)
	let dateFixed = null; // {mo, d, y?}
	if (/\s(?:porshu|porsu|parshu|day\s+after\s+tomorrow)\s/i.test(s)) { dayOffset = 2; s = s.replace(/\s(?:porshu|porsu|parshu|day\s+after\s+tomorrow)\s/i, " "); }
	else if (/\s(?:kal|kalke|agamikal|tomorrow|tmrw|tomorow)\s/i.test(s)) { dayOffset = 1; s = s.replace(/\s(?:kal|kalke|agamikal|tomorrow|tmrw|tomorow)\s/i, " "); }
	else if (/\s(?:aj|ajke|aaj|today)\s/i.test(s)) { dayOffset = 0; s = s.replace(/\s(?:aj|ajke|aaj|today)\s/i, " "); }

	const dm = s.match(/\s(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?(?=\s|$)/);
	if (dm && !/:/.test(dm[0])) {
		const a = +dm[1], b = +dm[2];
		if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
			dateFixed = { d: a, mo: b, y: dm[3] ? (+dm[3] < 100 ? 2000 + +dm[3] : +dm[3]) : null };
			s = s.replace(dm[0], " ");
		}
	}

	/* ---- 3. time of day ---- */
	let hour = null, minute = 0, period = null;
	let m;
	const periodWords = "sokal|shokal|bhor|vor|morning|dupur|dupure|dupurer|noon|bikel|bikal|bikele|afternoon|sondha|shondha|sandhya|evening|rat|raat|raate|night";

	// "9:30pm", "21:00", "9.30 tay"
	m = s.match(new RegExp(`\\s(?:(${periodWords})\\s+)?(\\d{1,2})\\s*[:.]\\s*(\\d{2})\\s*(am|pm|a\\.m\\.?|p\\.m\\.?)?\\s*(?:tay|ta|e|te)?(?=\\s|$)`, "i"));
	if (m) { hour = +m[2]; minute = +m[3]; period = periodOf(m[4]) || periodOf(m[1]); s = s.replace(m[0], " "); }
	else {
		// "9tay", "9 ta", "9pm", "9 am", "sokal 9 tay", "9 ta 30"
		m = s.match(new RegExp(`\\s(?:(${periodWords})\\s+)?(\\d{1,2})\\s*(am|pm|a\\.m\\.?|p\\.m\\.?|tay|ta|te|tar)(?:\\s*(\\d{1,2})(?:\\s*min(?:ute)?)?)?(?=\\s|$)`, "i"));
		if (m) {
			hour = +m[2];
			if (m[4] !== undefined && /^(tay|ta|te|tar)$/i.test(m[3])) minute = +m[4];
			period = periodOf(m[3]) || periodOf(m[1]);
			s = s.replace(m[0], /^(am|pm|a\.m\.?|p\.m\.?)$/i.test(m[3]) && m[4] !== undefined ? " " + m[4] + " " : " ");
		}
	}
	if (hour === null || hour > 23 || minute > 59) {
		if (dayOffset === null && !dateFixed) return { ok: false, error: "no_time" };
		if (hour === null) { hour = 9; minute = 0; period = "am"; } // "kal ..." with no time -> 9:00 AM
		else return { ok: false, error: "bad_time" };
	}

	/* ---- build the date ---- */
	const today = zonedParts(now, tz);
	let target; // {y, mo, d}
	if (dateFixed) {
		target = { y: dateFixed.y || today.y, mo: dateFixed.mo, d: dateFixed.d };
	} else {
		target = addDays(today.y, today.mo, today.d, dayOffset || 0);
	}

	const candidates = [];
	const push = (h24) => candidates.push(zonedToDate(target.y, target.mo, target.d, h24, minute, tz));

	if (hour >= 13) push(hour);
	else if (period === "am") push(hour === 12 ? 0 : hour);
	else if (period === "pm") push(hour === 12 ? 12 : hour + 12);
	else if (period === "night") push(hour === 12 ? 0 : hour >= 6 ? hour + 12 : hour);
	else if (hour === 0) push(0);
	else if (dayOffset !== null || dateFixed) {
		// explicit day, no am/pm: 6-11 -> morning, 12 and 1-5 -> afternoon
		push(hour >= 6 && hour <= 11 ? hour : hour === 12 ? 12 : hour + 12);
	} else {
		// no day, no am/pm: pick whichever interpretation comes next
		push(hour === 12 ? 0 : hour);
		push(hour === 12 ? 12 : hour + 12);
	}

	let at = candidates.filter(c => c.getTime() > now.getTime() + 5000).sort((a, b) => a - b)[0];
	if (!at) {
		if (dateFixed && !dateFixed.y) { // date already passed this year -> next year
			target = { y: target.y + 1, mo: target.mo, d: target.d };
			candidates.length = 0;
			if (hour >= 13) push(hour);
			else if (period === "am") push(hour === 12 ? 0 : hour);
			else push(hour >= 6 && hour <= 11 ? hour : hour === 12 ? 12 : hour + 12);
			at = candidates[0];
		} else if (dayOffset === 0 || dayOffset === null) { // time already passed today -> tomorrow
			const t2 = addDays(target.y, target.mo, target.d, 1);
			const fallback = candidates.map(c => new Date(c.getTime() + 86400000)).sort((a, b) => a - b)[0];
			at = fallback;
			void t2;
		}
	}
	if (!at) return { ok: false, error: "past" };

	return finish(at, clean(s), repeat, now);
}

function clean(text) {
	return String(text || "")
		.replace(FILLER, " ")
		.replace(/\s+/g, " ")
		.replace(/^[\s,:\-–]+|[\s,:\-–]+$/g, "")
		.trim();
}

function finish(at, text, repeat, now) {
	if (at.getTime() - now.getTime() > 366 * 86400000) return { ok: false, error: "too_far" };
	if (at.getTime() <= now.getTime()) return { ok: false, error: "past" };
	return { ok: true, at, text: text || "⏰", repeat };
}

function nextRepeat(at, repeat) {
	const step = repeat === "weekly" ? 7 * 86400000 : 86400000;
	let t = at.getTime ? at.getTime() : Number(at);
	const now = Date.now();
	while (t <= now) t += step;
	return t;
}

/* ------------------------------------------------------------------ */
/*  storage                                                           */
/* ------------------------------------------------------------------ */

let cache = null;

function load() {
	if (cache) return cache;
	try { cache = JSON.parse(fs.readFileSync(FILE, "utf8")); }
	catch (e) {
		try { cache = JSON.parse(fs.readFileSync(FILE + ".bak", "utf8")); }
		catch (_) { cache = []; }
	}
	if (!Array.isArray(cache)) cache = [];
	return cache;
}

function save() {
	fs.mkdirSync(path.dirname(FILE), { recursive: true });
	writeJsonAtomicSync(FILE, load());
}

function add({ userID, threadID, at, text, repeat, name }) {
	const list = load();
	const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
	const item = { id, userID: String(userID), threadID: String(threadID), at: at instanceof Date ? at.getTime() : Number(at), text, repeat: repeat || null, name: name || "", createdAt: Date.now(), tries: 0 };
	list.push(item);
	save();
	return item;
}

function listFor(userID, threadID) {
	return load().filter(r => r.userID === String(userID) && (threadID == null || r.threadID === String(threadID))).sort((a, b) => a.at - b.at);
}

function countFor(userID) {
	return load().filter(r => r.userID === String(userID)).length;
}

function remove(id) {
	const list = load();
	const i = list.findIndex(r => r.id === id);
	if (i === -1) return false;
	list.splice(i, 1);
	save();
	return true;
}

function clearFor(userID, threadID) {
	const list = load();
	const keep = list.filter(r => !(r.userID === String(userID) && (threadID == null || r.threadID === String(threadID))));
	const removed = list.length - keep.length;
	cache = keep;
	if (removed) save();
	return removed;
}

/* ------------------------------------------------------------------ */
/*  scheduler                                                         */
/* ------------------------------------------------------------------ */

let timer = null;
let ctx = { api: null, usersData: null };
let busy = false;

async function tick() {
	if (busy || !ctx.api) return;
	busy = true;
	try {
		const now = Date.now();
		const due = load().filter(r => r.at <= now);
		for (const r of due) {
			let sent = false;
			try {
				const late = now - r.at > 10 * 60 * 1000;
				const who = r.name || "";
				const body = `⏰ Reminder${who ? " for " + who : ""}${late ? " (late)" : ""}\n━━━━━━━━━━━━\n${r.text}`;
				const payload = who ? { body: `${who}\n${body}`, mentions: [{ tag: who, id: r.userID }] } : { body };
				await ctx.api.sendMessage(payload, r.threadID);
				sent = true;
			}
			catch (err) {
				r.tries = (r.tries || 0) + 1;
				if (r.tries >= 5 && now - r.at > 24 * 3600 * 1000) sent = true; // give up on very old, undeliverable ones
				else r.at = now + Math.min(60000 * r.tries, 15 * 60000); // retry later
			}
			if (sent) {
				if (r.repeat) { r.at = nextRepeat(r.at, r.repeat); r.tries = 0; }
				else {
					const list = load();
					const i = list.indexOf(r);
					if (i !== -1) list.splice(i, 1);
				}
			}
		}
		if (due.length) save();
	}
	catch (e) {
		console.log("[REMINDER] tick failed:", e && e.message ? e.message : e);
	}
	finally { busy = false; }
}

function start(context) {
	ctx = Object.assign(ctx, context || {});
	const cfg = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.reminders) || {};
	if (cfg.enable === false) return false;
	if (timer) return true; // already running, only the api reference was refreshed
	const every = Math.max(5, Number(cfg.checkIntervalSeconds) || 20) * 1000;
	timer = setInterval(tick, every);
	if (timer.unref) timer.unref();
	setTimeout(tick, 3000).unref?.();
	return true;
}

function stop() { if (timer) clearInterval(timer); timer = null; }

module.exports = {
	parseReminder, zonedParts, zonedToDate,
	add, remove, listFor, countFor, clearFor, nextRepeat,
	start, stop, tick, _reset: () => { cache = null; }
};
