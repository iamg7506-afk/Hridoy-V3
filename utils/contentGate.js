"use strict";
/**
 * contentGate — one central policy for adult (NSFW) commands.
 *
 * config.json -> contentGate.nsfw.mode
 *   "off"   : NSFW commands are blocked for everyone
 *   "admin" : only bot admins (config.adminBot) can run them   [default]
 *   "all"   : no restriction (old behaviour)
 *
 * A command counts as NSFW when its config.category is "nsfw" (or contains "18+"),
 * or its name is listed in contentGate.nsfw.extraCommands.
 */

function getCfg() {
	return global.GoatBot?.config?.contentGate?.nsfw || {};
}

function getMode() {
	const mode = String(getCfg().mode || "admin").toLowerCase();
	return ["off", "admin", "all"].includes(mode) ? mode : "admin";
}

function isNsfw(command) {
	const cfg = command?.config || {};
	const category = String(cfg.category || "").toLowerCase();
	const name = String(cfg.name || "").toLowerCase();
	const extra = (getCfg().extraCommands || []).map(n => String(n).toLowerCase());
	return category === "nsfw" || category.includes("18+") || extra.includes(name);
}

/**
 * @param {object} command  loaded command module
 * @param {number} role     0 = user, 1 = group admin, 2 = bot admin, 3 = developer
 * @returns {{blocked: boolean, message?: string}}
 */
function check(command, role) {
	if (!isNsfw(command)) return { blocked: false };
	const mode = getMode();
	if (mode === "all") return { blocked: false };
	if (mode === "admin" && role >= 2) return { blocked: false };
	return {
		blocked: true,
		message: mode === "off"
			? "🔞 | Adult (NSFW) commands are disabled on this bot."
			: "🔞 | Adult (NSFW) commands are restricted to bot admins."
	};
}

module.exports = { check, isNsfw, getMode };
