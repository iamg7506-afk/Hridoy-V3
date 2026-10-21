"use strict";
/**
 * Builds the options object handed to the FCA login() from config.json.
 *
 * @eryxenx/fca 1.1.x recognises only the keys below; anything else passed to
 * setOptions() produces an "Unrecognized option" warning on every start. The
 * GoatBot config keeps extra keys (logLevel, enableE2EE, reactionDebug,
 * autoMarkDelivery, notes ...) that other parts of the bot read, so they stay
 * in config.json and are simply not forwarded.
 */

const FCA_OPTION_KEYS = [
	"online", "selfListen", "listenEvents", "updatePresence", "forceLogin",
	"autoMarkRead", "listenTyping", "autoReconnect", "emitReady", "selfListenEvent",
	"userAgent", "proxy", "humanize"
];

// The stock GoatBot value: an Android Chrome 101 string. Cookies copied from a
// desktop browser and replayed with this UA (while the FCA's own client hints
// say desktop Chrome) are an inconsistent fingerprint, so it is never forwarded.
const STALE_DEFAULT_UA_MARKERS = ["M2102J20SG", "Chrome/101.0.0.0 Mobile"];

function isStaleUserAgent(ua) {
	return typeof ua === "string" && STALE_DEFAULT_UA_MARKERS.some(m => ua.includes(m));
}

/**
 * @param {object} config global.GoatBot.config
 * @returns {{options: object, dropped: string[], userAgentSource: string}}
 */
function buildFcaOptions(config) {
	const src = (config && config.optionsFca) || {};
	const fb = (config && config.facebookAccount) || {};
	const options = {};
	const dropped = [];

	for (const key of Object.keys(src)) {
		if (FCA_OPTION_KEYS.includes(key)) options[key] = src[key];
		else if (!key.startsWith("_") && key !== "notes") dropped.push(key);
	}

	let userAgentSource = "fca-default";
	if (typeof fb.userAgent === "string" && fb.userAgent.trim() && !isStaleUserAgent(fb.userAgent)) {
		options.userAgent = fb.userAgent.trim();
		userAgentSource = "config.facebookAccount.userAgent";
	}
	else if (typeof options.userAgent === "string" && isStaleUserAgent(options.userAgent)) {
		delete options.userAgent;
	}

	if (typeof fb.proxy === "string" && fb.proxy.trim() && !options.proxy)
		options.proxy = fb.proxy.trim();

	// Never let a stale config switch these on by accident: both are visible,
	// repeated account actions rather than listening.
	if (options.updatePresence === undefined) options.updatePresence = false;
	if (options.forceLogin === undefined) options.forceLogin = false;

	return { options, dropped, userAgentSource };
}

module.exports = { buildFcaOptions, FCA_OPTION_KEYS, isStaleUserAgent };
