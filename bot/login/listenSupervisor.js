"use strict";
/**
 * listenSupervisor — decides what to do with whatever @eryxenx/fca hands to
 * the listen callback as its first argument.
 *
 * The FCA reports control events through the *error* slot:
 *   { type: "ready" }                     informational (only with emitReady)
 *   { type: "stop_listen", error }        its own reconnect budget ran out
 *   { type: "account_inactive", reason }  session invalid / checkpoint / blocked
 * The stock GoatBot callback treated all of these as fatal, logged "ready" as an
 * error, and answered every failure with process.exit(2), which index.js turns
 * into an immediate re-login. Re-logging in with a dead session only produces
 * more login traffic, which is what Facebook flags. This module keeps the
 * distinctions and bounds the retries.
 */

const CLOSED = new Set(["Connection closed.", "Connection closed by user."]);

/**
 * @returns {{kind: "none"|"ready"|"closed"|"auth"|"exhausted"|"transient"|"other", message: string}}
 */
function classifyListenError(err) {
	if (!err) return { kind: "none", message: "" };
	if (typeof err === "string") {
		if (CLOSED.has(err)) return { kind: "closed", message: err };
		if (/not logged in/i.test(err)) return { kind: "auth", message: err };
		if (/server unavailable/i.test(err)) return { kind: "transient", message: err };
		return { kind: "other", message: err };
	}
	const message = String(err.error || err.message || err.reason || "");
	if (err.type === "ready") return { kind: "ready", message };
	if (err.type === "account_inactive") return { kind: "auth", message: message || err.reason || "account inactive" };
	if (/not logged in|login_blocked|blocked the login|checkpoint|1357001/i.test(message)) return { kind: "auth", message };
	if (err.type === "stop_listen") return { kind: "exhausted", message };
	if (/server unavailable|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(message)) return { kind: "transient", message };
	return { kind: "other", message };
}

function withJitter(ms, fraction) {
	const f = typeof fraction === "number" ? fraction : 0.2;
	return Math.max(0, Math.round(ms * (1 - f + Math.random() * 2 * f)));
}

/**
 * Bounded exponential backoff: next() -> delay in ms, or null once the budget is spent.
 */
function createBackoff({ baseMs = 15000, maxMs = 300000, maxAttempts = 6, jitter = 0.2 } = {}) {
	let attempts = 0;
	return {
		next() {
			if (attempts >= maxAttempts) return null;
			const raw = Math.min(baseMs * Math.pow(2, attempts), maxMs);
			attempts++;
			return withJitter(raw, jitter);
		},
		reset() { attempts = 0; },
		get attempts() { return attempts; }
	};
}

/**
 * Jittered delay for the optional periodic listener refresh, so reconnects do not
 * land on a clockwork-exact schedule.
 */
function nextRefreshDelay(timeRestartMs) {
	const base = Number(timeRestartMs) > 0 ? Number(timeRestartMs) : 2 * 60 * 60 * 1000;
	return withJitter(base, 0.15);
}

module.exports = { classifyListenError, createBackoff, withJitter, nextRefreshDelay };
