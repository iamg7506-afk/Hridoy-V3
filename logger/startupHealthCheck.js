/**
 * startupHealthCheck.js
 *
 * Runs once, right after commands/events finish loading, and prints a
 * clear pass/fail summary of the systems the bot depends on
 * (audit requirement #11). This is read-only - it never modifies config,
 * data files, or bot state. A failed check is reported clearly; it does
 * NOT kill the process by itself (a single missing optional feature, like
 * E2EE not being configured, shouldn't take the whole bot down) - only
 * genuinely critical failures (no commands loaded, no database) are called
 * out as ✖ so the operator notices immediately.
 */

module.exports = async function runStartupHealthCheck() {
	const { log } = global.utils;
	const { GoatBot, db } = global;
	const config = GoatBot.config;

	const lines = [];
	let hasCriticalFailure = false;

	function check(label, ok, detail, critical = false) {
		const icon = ok ? "✅" : (critical ? "❌" : "⚠️");
		lines.push(`${icon} ${label}${detail ? ` — ${detail}` : ""}`);
		if (!ok && critical)
			hasCriticalFailure = true;
	}

	// Commands loaded
	const commandCount = GoatBot.commands?.size || 0;
	check("Commands loaded", commandCount > 0, `${commandCount} command(s)`, true);

	// Events loaded
	const eventCount = GoatBot.eventCommands?.size || 0;
	check("Events loaded", eventCount > 0, `${eventCount} event(s)`, true);

	// Database loaded
	const dbType = config.database?.type;
	const usersLoaded = Array.isArray(db?.allUserData);
	const threadsLoaded = Array.isArray(db?.allThreadData);
	check("Database connected", !!dbType && (usersLoaded || threadsLoaded), `type: ${dbType || "unknown"}`, true);

	// User data loaded
	check("User data loaded", usersLoaded, `${db?.allUserData?.length ?? 0} user(s)`, true);

	// Group data loaded
	check("Group data loaded", threadsLoaded, `${db?.allThreadData?.length ?? 0} thread(s)`, true);

	// APIs / credentials configured (presence only - doesn't validate they actually work)
	const hasGmail = !!(config.credentials?.gmailAccount?.email);
	const hasRecaptcha = !!(config.credentials?.gRecaptcha?.siteKey);
	check("APIs checked", true, `gmail: ${hasGmail ? "configured" : "not set"}, recaptcha: ${hasRecaptcha ? "configured" : "not set"}`);

	// E2EE
	if (config.e2ee?.enable) {
		const persists = !config.e2ee.memoryOnly && !!config.e2ee.devicePath;
		check("E2EE checked", true, persists ? "enabled, sessions persist across restart" : "enabled, memory-only (sessions reset on restart)");
	}
	else {
		check("E2EE checked", true, "disabled in config");
	}

	// Inbox
	check("Inbox checked", true, config.antiInbox ? "antiInbox: on" : "antiInbox: off");

	const summary = lines.join("\n");
	if (hasCriticalFailure)
		log.error("STARTUP_HEALTH", `Startup health check found critical problems:\n${summary}`);
	else
		log.info("STARTUP_HEALTH", `Startup health check:\n${summary}`);
};
