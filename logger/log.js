const { colors } = require('../func/colors.js');
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const characters = '';
const getCurrentTime = () => colors.gray(moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY"));

// ═══════════ Persistent log-to-file (new) ═══════════
const logsDir = path.join(process.cwd(), "logs");
try {
	if (!fs.existsSync(logsDir))
		fs.mkdirSync(logsDir, { recursive: true });
} catch (e) {
	// If we truly can't create the folder, just skip file logging silently
}

function stripAnsi(str) {
	return String(str).replace(/\x1b\[[0-9;]*m/g, "");
}

function writeToFile(fileName, prefix, ...parts) {
	try {
		const time = moment().tz("Asia/Dhaka").format("YYYY-MM-DD HH:mm:ss");
		const line = `[${time}] [${prefix}] ` + parts
			.map(p => {
				if (p === undefined) return "";
				if (typeof p === "object")
					return p && p.stack ? p.stack : JSON.stringify(p);
				return stripAnsi(p);
			})
			.filter(Boolean)
			.join(" ") + "\n";
		fs.appendFile(path.join(logsDir, fileName), line, () => {});
	} catch (e) {
		// never let logging crash the bot
	}
}

function logError(prefix, message) {
	if (message === undefined) {
		message = prefix;
		prefix = "ERROR";
	}
	console.log(`${getCurrentTime()} ${colors.redBright(`${characters} ${prefix}:`)}`, message);
	writeToFile("error.log", prefix, message);
	const error = Object.values(arguments).slice(2);
	for (let err of error) {
		if (typeof err == "object" && !err.stack)
			err = JSON.stringify(err, null, 2);
		console.log(`${getCurrentTime()} ${colors.redBright(`${characters} ${prefix}:`)}`, err);
		writeToFile("error.log", prefix, err);
	}
}

module.exports = {
	err: logError,
	error: logError,
	warn: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "WARN";
		}
		console.log(`${getCurrentTime()} ${colors.yellowBright(`${characters} ${prefix}:`)}`, message);
		writeToFile("bot.log", prefix, message);
	},
	info: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "INFO";
		}
		console.log(`${getCurrentTime()} ${colors.greenBright(`${characters} ${prefix}:`)}`, message);
	},
	// ═══════════ New: performance / slow-command logger ═══════════
	perf: function (prefix, message) {
		console.log(`${getCurrentTime()} ${colors.magenta(`${characters} ${prefix}:`)}`, message);
		writeToFile("performance.log", prefix, message);
	},
	success: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "SUCCES";
		}
		console.log(`${getCurrentTime()} ${colors.cyanBright(`${characters} ${prefix}:`)}`, message);
	},
	master: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "MASTER";
		}
		console.log(`${getCurrentTime()} ${colors.hex("#eb6734", `${characters} ${prefix}:`)}`, message);
	},
	dev: (...args) => {
		if (["development", "production"].includes(process.env.NODE_ENV) == false)
			return;
		try {
			throw new Error();
		}
		catch (err) {
			const at = err.stack.split('\n')[2];
			let position = at.slice(at.indexOf(process.cwd()) + process.cwd().length + 1);
			position.endsWith(')') ? position = position.slice(0, -1) : null;
			console.log(`\x1b[36m${position} =>\x1b[0m`, ...args);
		}
	}
};