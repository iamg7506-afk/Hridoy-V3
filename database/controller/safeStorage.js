/**
 * safeStorage.js
 * Crash-safe JSON read/write helpers for the JSON-mode database controllers
 * (usersData, threadsData, globalData, dashBoardData).
 *
 * Problem this fixes:
 *   The controllers previously called fs-extra's writeJsonSync() directly on
 *   the live data file. writeJsonSync is NOT atomic - if the process is
 *   killed (crash, OOM-kill, force restart, power loss) while the write is
 *   in progress, the data file is left truncated/corrupted with no way to
 *   recover, and the bot would then either crash on next boot (JSON.parse
 *   failure) or silently start from an empty/partial data set - real user
 *   balance/XP/group-settings loss.
 *
 * What this module does:
 *   1. Atomic write: write to a temp file in the same directory, fsync it,
 *      then rename() over the real file. rename() on the same filesystem is
 *      atomic on POSIX systems - readers never see a half-written file, and
 *      a crash mid-write leaves the ORIGINAL file untouched.
 *   2. Rotating backups: before overwriting, the previous good file is
 *      copied into data/backup/<name>.bak (single rolling backup, kept
 *      small on purpose per the "don't make backups unnecessarily huge"
 *      requirement).
 *   3. Safe read with recovery: if the main file is missing / not valid
 *      JSON, automatically fall back to the .bak backup instead of crashing
 *      the whole bot at startup. Only if both are unreadable does it fall
 *      back to the caller-provided default.
 */

const fs = require("fs-extra");
const path = require("path");

const backupDir = path.join(__dirname, "..", "data", "backup");

function backupPathFor(filePath) {
	return path.join(backupDir, path.basename(filePath) + ".bak");
}

/**
 * Atomically write JSON data to disk with a rotating backup of the
 * previous version. Synchronous, to preserve the exact call-site
 * semantics of the writeJsonSync() calls it replaces.
 */
function writeJsonSafeSync(filePath, data, options = { spaces: 2, EOL: "\n" }) {
	fs.ensureDirSync(path.dirname(filePath));
	fs.ensureDirSync(backupDir);

	// Back up the current on-disk version first (best-effort - if this is
	// the very first write, there's nothing to back up yet).
	try {
		if (fs.existsSync(filePath))
			fs.copySync(filePath, backupPathFor(filePath));
	}
	catch (err) {
		// Non-fatal: a failed backup should never block saving the new data.
		try { require("../../logger/log.js").warn("SAFE_STORAGE", `Could not back up "${path.basename(filePath)}": ${err.message}`); }
		catch (e) { /* ignore */ }
	}

	// Write to a temp file in the same directory (same filesystem, so the
	// rename below is atomic), then rename it over the real file.
	const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
	const json = JSON.stringify(data, null, options.spaces ?? 2);
	const fd = fs.openSync(tmpPath, "w");
	try {
		fs.writeSync(fd, json + (options.EOL ?? "\n"));
		fs.fsyncSync(fd);
	} finally {
		fs.closeSync(fd);
	}
	fs.renameSync(tmpPath, filePath);
}

/**
 * Read JSON data from disk. If the main file is missing or corrupted,
 * automatically recover from the rolling backup. If neither is readable,
 * return defaultValue instead of throwing (so a corrupted data file
 * cannot take down the whole bot at startup).
 */
function readJsonSafeSync(filePath, defaultValue = []) {
	const tryRead = (p) => {
		const raw = fs.readFileSync(p, "utf8");
		return JSON.parse(raw);
	};

	if (fs.existsSync(filePath)) {
		try {
			return tryRead(filePath);
		}
		catch (err) {
			try { require("../../logger/log.js").err("SAFE_STORAGE", `"${path.basename(filePath)}" is corrupted (${err.message}), attempting recovery from backup...`); }
			catch (e) { /* ignore */ }
		}
	}

	const backupPath = backupPathFor(filePath);
	if (fs.existsSync(backupPath)) {
		try {
			const recovered = tryRead(backupPath);
			try { require("../../logger/log.js").warn("SAFE_STORAGE", `Recovered "${path.basename(filePath)}" from backup.`); }
			catch (e) { /* ignore */ }
			// Restore the main file from the backup so future writes/reads
			// (and other processes, e.g. the dashboard) see consistent data.
			try { writeJsonSafeSync(filePath, recovered); }
			catch (e) { /* ignore, recovered value is still returned below */ }
			return recovered;
		}
		catch (err) {
			try { require("../../logger/log.js").err("SAFE_STORAGE", `Backup for "${path.basename(filePath)}" is also corrupted (${err.message}). Falling back to default value.`); }
			catch (e) { /* ignore */ }
		}
	}

	// Nothing usable on disk - initialize fresh rather than crashing.
	try { writeJsonSafeSync(filePath, defaultValue); }
	catch (e) { /* ignore */ }
	return defaultValue;
}

module.exports = { writeJsonSafeSync, readJsonSafeSync };
