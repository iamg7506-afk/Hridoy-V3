"use strict";
/**
 * Read-only loader for the cookie file (account.txt).
 *
 * Accepts the three formats browser extensions export:
 *   1. JSON array  (c3c / Cookie-Editor / EditThisCookie)  -> returned untouched
 *   2. "name=value; name=value" cookie string
 *   3. Netscape cookies.txt
 *
 * It NEVER writes the file and NEVER falls back to e-mail/password login. A
 * password login creates a second session and is the classic trigger for
 * "suspicious login" checkpoints, so it must be an explicit choice, not a
 * side effect of a file the loader could not parse.
 */

const fs = require("fs");

function fromCookieString(text) {
	return text.split(";").map(part => {
		const i = part.indexOf("=");
		if (i < 0) return null;
		return {
			key: part.slice(0, i).trim(),
			value: part.slice(i + 1).trim(),
			domain: "facebook.com",
			path: "/",
			hostOnly: false,
			creation: new Date().toISOString(),
			lastAccessed: new Date().toISOString()
		};
	}).filter(c => c && c.key && c.value && c.key !== "x-referer");
}

function fromNetscape(text) {
	const out = [];
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim() || (line.startsWith("#") && !line.startsWith("#HttpOnly_"))) continue;
		const cols = line.replace(/^#HttpOnly_/, "").split("\t").map(s => s.trim());
		if (cols.length < 7) continue;
		out.push({
			key: cols[5],
			value: cols[6],
			domain: cols[0].replace(/^\./, "") || "facebook.com",
			path: cols[2] || "/",
			hostOnly: false,
			creation: new Date().toISOString(),
			lastAccessed: new Date().toISOString()
		});
	}
	return out;
}

const nameOf = c => c && (c.key || c.name);

/**
 * @param {string} file absolute path of account.txt
 * @returns {{ok: boolean, cookies?: object[], format?: string, reason?: string}}
 */
function loadAppState(file) {
	let raw;
	try {
		raw = fs.readFileSync(file, "utf8");
	}
	catch (e) {
		return { ok: false, reason: `cannot read ${file}: ${e.message}` };
	}
	raw = raw.replace(/^\uFEFF/, "").trim();
	if (!raw) return { ok: false, reason: "cookie file is empty" };

	let cookies, format;
	if (raw.startsWith("[") || raw.startsWith("{")) {
		let parsed;
		try { parsed = JSON.parse(raw); }
		catch (e) { return { ok: false, reason: "cookie file looks like JSON but does not parse: " + e.message }; }
		if (!Array.isArray(parsed)) parsed = parsed.cookies || parsed.appState || parsed.appstate;
		if (!Array.isArray(parsed)) return { ok: false, reason: "JSON cookie file has no cookie array" };
		cookies = parsed;
		format = "json";
	}
	else if (raw.split(/\r?\n/).some(l => l.split("\t").length >= 7)) {
		cookies = fromNetscape(raw);
		format = "netscape";
	}
	else if (/^\s*[\w.-]+\s*=/.test(raw)) {
		cookies = fromCookieString(raw);
		format = "cookie-string";
	}
	else {
		return { ok: false, reason: "unrecognised cookie file format (expected JSON array, cookie string or Netscape)" };
	}

	const names = new Set(cookies.map(nameOf));
	const missing = ["c_user", "xs"].filter(n => !names.has(n));
	if (missing.length) return { ok: false, reason: `cookie file is missing required cookie(s): ${missing.join(", ")}` };

	return { ok: true, cookies, format };
}

module.exports = { loadAppState, fromCookieString, fromNetscape };
