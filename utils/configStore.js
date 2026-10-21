"use strict";
const path = require("path");
const { writeJsonAtomicSync } = require("./atomicJson.js");

/**
 * Persist the live global.GoatBot.config object to config.json atomically
 * (temp file + fsync + rename, previous version kept as config.json.bak).
 */
function saveConfig() {
	const file = (global.client && global.client.dirConfig) || path.join(process.cwd(), "config.json");
	writeJsonAtomicSync(file, global.GoatBot.config, { spaces: 2 });
	return file;
}

function isBotAdmin(userID) {
	return (global.GoatBot.config.adminBot || []).map(String).includes(String(userID));
}

module.exports = { saveConfig, isBotAdmin };
