"use strict";
/**
 * Auto backup: database + config + command data -> one .json.gz file.
 * Destinations: local folder, Telegram, MongoDB (chunked), Google Drive.
 * account*.txt (cookies) and the E2EE device file are NEVER included.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SECRET_KEY = /pass|secret|token|uri|apikey|2fa|cookie|webhook|refresh/i;
let task = null;
let last = { at: 0, ok: null, file: "", info: "" };

function cfg() { return (global.GoatBot && global.GoatBot.config && global.GoatBot.config.autoBackup) || {}; }

function redact(obj) {
	if (Array.isArray(obj)) return obj.map(redact);
	if (obj && typeof obj === "object") {
		const out = {};
		for (const [k, v] of Object.entries(obj)) {
			if (typeof v === "string" && v.trim() && SECRET_KEY.test(k) && !/^notes?$|_note/i.test(k)) out[k] = "[REDACTED]";
			else out[k] = redact(v);
		}
		return out;
	}
	return obj;
}

function collectFiles(c) {
	const files = {};
	const root = process.cwd();
	const addFile = (rel) => {
		try {
			const p = path.join(root, rel);
			const st = fs.statSync(p);
			if (st.isFile() && st.size < 25 * 1024 * 1024) files[rel.replace(/\\/g, "/")] = fs.readFileSync(p).toString("base64");
		} catch (_) { /* missing is fine */ }
	};
	if (c.includeConfig !== false) {
		const conf = c.redactSecrets === false ? global.GoatBot.config : redact(global.GoatBot.config);
		files["config.json"] = Buffer.from(JSON.stringify(conf, null, 2)).toString("base64");
		addFile("configCommands.json");
	}
	if (c.includeDatabase !== false) {
		const exp = {
			threads: global.db && global.db.allThreadData || [],
			users: global.db && global.db.allUserData || [],
			global: global.db && global.db.allGlobalData || [],
			dashboard: global.db && global.db.allDashBoardData || []
		};
		files["database-export.json"] = Buffer.from(JSON.stringify(exp)).toString("base64");
		addFile("database/data/data.sqlite");
	}
	if (c.includeScriptData !== false) {
		for (const f of ["data/reminders.json", "scripts/cmds/prefixData.json"]) addFile(f);
		const cache = path.join(root, "scripts", "cmds", "cache");
		try { for (const f of fs.readdirSync(cache)) if (f.endsWith(".json")) addFile(`scripts/cmds/cache/${f}`); } catch (_) { /* none */ }
	}
	return files;
}

function stamp() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-"); }

function build(c) {
	const payload = { format: "toru-backup/1", createdAt: new Date().toISOString(), redacted: c.redactSecrets !== false, files: collectFiles(c) };
	return zlib.gzipSync(Buffer.from(JSON.stringify(payload)));
}

async function toTelegram(buf, name, t) {
	const FormData = require("form-data"), axios = require("axios");
	if (buf.length > 49 * 1024 * 1024) throw new Error("file > 50MB, Telegram refuses it");
	const fd = new FormData();
	fd.append("chat_id", t.chatId);
	fd.append("caption", `🗄 ${name}`);
	fd.append("document", buf, { filename: name });
	await axios.post(`https://api.telegram.org/bot${t.botToken}/sendDocument`, fd, { headers: fd.getHeaders(), maxBodyLength: Infinity, timeout: 120000 });
}

async function toMongo(buf, name, m) {
	const mongoose = require("mongoose");
	if (!mongoose.connection || !mongoose.connection.db) throw new Error("mongodb not connected");
	const col = mongoose.connection.db.collection(m.collection || "toru_backups");
	const b64 = buf.toString("base64"), size = 4 * 1024 * 1024, parts = Math.ceil(b64.length / size) || 1;
	for (let i = 0; i < parts; i++) await col.insertOne({ name, part: i, parts, data: b64.slice(i * size, (i + 1) * size), createdAt: new Date() });
	const names = await col.distinct("name");
	const old = names.sort().slice(0, Math.max(0, names.length - (m.keep || 5)));
	if (old.length) await col.deleteMany({ name: { $in: old } });
}

async function toDrive(buf, name, d) {
	const { google } = require("googleapis");
	const g = global.GoatBot.config.credentials.gmailAccount;
	if (!d.refreshToken) throw new Error("drive.refreshToken missing");
	const auth = new google.auth.OAuth2(g.clientId, g.clientSecret, "https://developers.google.com/oauthplayground");
	auth.setCredentials({ refresh_token: d.refreshToken });
	const drive = google.drive({ version: "v3", auth });
	const { Readable } = require("stream");
	await drive.files.create({ requestBody: { name, parents: d.folderId ? [d.folderId] : undefined }, media: { mimeType: "application/gzip", body: Readable.from(buf) } });
	if (d.folderId) {
		const res = await drive.files.list({ q: `'${d.folderId}' in parents and name contains 'toru-backup-' and trashed=false`, orderBy: "createdTime desc", fields: "files(id)" });
		for (const f of (res.data.files || []).slice(d.keep || 5)) await drive.files.delete({ fileId: f.id }).catch(() => {});
	}
}

async function run(reason = "manual") {
	const c = cfg(), name = `toru-backup-${stamp()}.json.gz`, d = c.destinations || {}, done = [], failed = [];
	try {
		const buf = build(c);
		if (!d.local || d.local.enable !== false) {
			const dir = path.join(process.cwd(), (d.local && d.local.dir) || "data/backups");
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(path.join(dir, name), buf);
			const all = fs.readdirSync(dir).filter(f => f.startsWith("toru-backup-")).sort();
			for (const f of all.slice(0, Math.max(0, all.length - (c.keepLocal || 10)))) fs.unlinkSync(path.join(dir, f));
			done.push("local");
		}
		const jobs = [["telegram", toTelegram], ["mongo", toMongo], ["drive", toDrive]];
		for (const [k, fn] of jobs) if (d[k] && d[k].enable) {
			try { await fn(buf, name, d[k]); done.push(k); } catch (e) { failed.push(`${k}: ${e.message}`); }
		}
		last = { at: Date.now(), ok: failed.length === 0, file: name, info: `${(buf.length / 1024).toFixed(0)} KB -> ${done.join(", ")}${failed.length ? " | failed " + failed.join("; ") : ""}` };
	} catch (e) {
		last = { at: Date.now(), ok: false, file: name, info: e.message };
	}
	console.log(`[AUTO BACKUP] (${reason}) ${last.ok ? "OK" : "PROBLEM"} ${last.file} ${last.info}`);
	if (!last.ok) { try { require("./bridge.js").notify(`⚠️ Backup problem: ${last.info}`); } catch (_) {} }
	return last;
}

function start() {
	const c = cfg();
	if (!c.enable || task) return !!task;
	const cron = require("node-cron");
	if (!cron.validate(c.cron || "0 */6 * * *")) { console.log("[AUTO BACKUP] invalid cron:", c.cron); return false; }
	task = cron.schedule(c.cron || "0 */6 * * *", () => run("schedule"), { timezone: global.GoatBot.config.timeZone || "Asia/Dhaka" });
	return true;
}

module.exports = { run, start, redact, build, status: () => last };
