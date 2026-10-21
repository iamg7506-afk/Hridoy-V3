"use strict";
/**
 * Per-group settings helpers.
 *
 * Everything lives in the thread's own `data` object (same place the stock
 * `prefix` / `setlang` features use), so it is stored by whatever database you
 * run (sqlite / mongodb / json) and is isolated per group:
 *
 *   data.prefix            custom prefix            (read by utils.getPrefix)
 *   data.lang              language code            (read by handlerEvents)
 *   data.disabledCommands  ["ping", "weather", ...] commands switched off here
 */

// these can never be switched off, otherwise a group could lock itself out
const PROTECTED = new Set(["gset", "help"]);

function norm(name) {
	return String(name || "").trim().toLowerCase();
}

function getDisabled(threadData) {
	const list = threadData && threadData.data && threadData.data.disabledCommands;
	return Array.isArray(list) ? list.map(norm) : [];
}

function isProtected(name) {
	return PROTECTED.has(norm(name));
}

/**
 * True when `commandName` is switched off for this group.
 * Aliases are resolved by the caller (handlerEvents passes the real name).
 */
function isCommandDisabled(threadData, commandName) {
	const name = norm(commandName);
	if (!name || isProtected(name)) return false;
	return getDisabled(threadData).includes(name);
}

/** Pure helper: returns the new list after enabling/disabling. */
function toggled(list, commandName, disable) {
	const name = norm(commandName);
	const set = new Set((list || []).map(norm));
	if (disable) set.add(name);
	else set.delete(name);
	return [...set].sort();
}

module.exports = { PROTECTED, getDisabled, isCommandDisabled, isProtected, toggled, norm };
