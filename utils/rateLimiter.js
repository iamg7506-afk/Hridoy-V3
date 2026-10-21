"use strict";
/**
 * Per-command rate limiter (sliding window, per user).
 *
 * Sits on top of each command's own `countDown` cooldown: the cooldown stops
 * two quick calls, this stops someone calling the same command 40 times a
 * minute at a slow, steady pace (API-quota abuse, AI commands, spam).
 *
 * config.json -> rateLimit
 *   enable, ignoreAdmin, notify,
 *   default:    { maxUses, perSeconds }
 *   perCommand: { "<commandName>": { maxUses, perSeconds } }
 */

const hits = new Map(); // "cmd|user" -> number[] (timestamps, ms)
const warned = new Map(); // "cmd|user" -> ms timestamp of last "slow down" notice

function cfg() {
	return (global.GoatBot && global.GoatBot.config && global.GoatBot.config.rateLimit) || {};
}

function limitFor(commandName, config) {
	const c = config || cfg();
	const own = c.perCommand && c.perCommand[String(commandName).toLowerCase()];
	const lim = own || c.default;
	if (!lim) return null;
	const maxUses = Number(lim.maxUses);
	const perSeconds = Number(lim.perSeconds);
	if (!(maxUses > 0) || !(perSeconds > 0)) return null; // 0 / invalid = unlimited
	return { maxUses, perSeconds };
}

/**
 * Register one use and tell the caller whether it is allowed.
 * @returns {{allowed:boolean, retryAfterSec:number, notify:boolean, limit:object|null}}
 */
function check(commandName, userID, isAdmin, now = Date.now(), config) {
	const c = config || cfg();
	if (!c.enable) return { allowed: true, retryAfterSec: 0, notify: false, limit: null };
	if (isAdmin && c.ignoreAdmin !== false) return { allowed: true, retryAfterSec: 0, notify: false, limit: null };

	const limit = limitFor(commandName, c);
	if (!limit) return { allowed: true, retryAfterSec: 0, notify: false, limit: null };

	const key = `${String(commandName).toLowerCase()}|${userID}`;
	const windowMs = limit.perSeconds * 1000;
	const list = (hits.get(key) || []).filter(t => now - t < windowMs);

	if (list.length >= limit.maxUses) {
		hits.set(key, list);
		const retryAfterSec = Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000));
		// only tell the user once per window so the warning itself is not spam
		const lastWarn = warned.get(key);
		const notify = c.notify !== false && (lastWarn === undefined || now - lastWarn >= windowMs);
		if (notify) warned.set(key, now);
		return { allowed: false, retryAfterSec, notify, limit };
	}

	list.push(now);
	hits.set(key, list);
	return { allowed: true, retryAfterSec: 0, notify: false, limit };
}

function reset() {
	hits.clear();
	warned.clear();
}

// keep memory flat on a long-running bot
const sweeper = setInterval(() => {
	const now = Date.now();
	const longest = Math.max(
		60,
		Number(cfg().default && cfg().default.perSeconds) || 0,
		...Object.values(cfg().perCommand || {}).map(v => Number(v && v.perSeconds) || 0)
	) * 1000;
	for (const [key, list] of hits) {
		if (!list.length || now - list[list.length - 1] > longest) {
			hits.delete(key);
			warned.delete(key);
		}
	}
}, 5 * 60 * 1000);
if (sweeper.unref) sweeper.unref();

module.exports = { check, limitFor, reset };
