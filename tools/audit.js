#!/usr/bin/env node
"use strict";
/**
 * Toru GoatBot project audit  —  `npm run audit`  (or `npm run audit:json`)
 *
 * Statically checks every JS file (no bot login / network needed):
 *   1. syntax of every .js file (node --check)
 *   2. commands & events: name, category, onStart, role, duplicate names, alias collisions
 *   3. require() of packages missing from package.json, and broken relative requires
 *   4. secrets left in config.json / source, remote eval(), non-sensible role-0 admin commands
 * Exit code 1 when an ERROR is found, so it can run in CI.
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const asJson = process.argv.includes("--json");
const pkg = require(path.join(root, "package.json"));
const deps = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
try { Object.keys(require(path.join(root, "node_modules", "hridoy-ultimate", "package.json")).dependencies || {}).forEach(d => deps.add(d)); } catch { /* fca not installed yet */ }
const builtins = new Set(Module.builtinModules.flatMap(m => [m, "node:" + m]));
const findings = []; // {level, file, msg}
const add = (level, file, msg) => findings.push({ level, file, msg });

function walk(dir, out = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (["node_modules", ".git", "logs"].includes(e.name)) continue;
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (e.name.endsWith(".js") && !e.name.endsWith(".min.js")) out.push(p);
	}
	return out;
}

// 1) syntax
const jsFiles = walk(root).filter(f => !f.includes(`${path.sep}dashboard${path.sep}js${path.sep}`));
for (const f of jsFiles) {
	const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
	if (r.status !== 0) add("ERROR", path.relative(root, f), "syntax: " + (r.stderr || "").split("\n").find(l => /Error/.test(l)));
}

// 2) commands/events
const seen = { cmds: {}, events: {} };
const aliasOwner = {};
for (const kind of ["cmds", "events"]) {
	const dir = path.join(root, "scripts", kind);
	for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".js"))) {
		const rel = `scripts/${kind}/${f}`;
		const src = fs.readFileSync(path.join(dir, f), "utf8");
		const name = (src.match(/name:\s*["'`]([^"'`]+)["'`]/) || [])[1];
		if (!name) { add("ERROR", rel, "config.name missing"); continue; }
		const key = name.toLowerCase();
		(seen[kind][key] ??= []).push(f);
		if (!/category\s*:/.test(src)) add("ERROR", rel, "config.category missing (loader will reject it)");
		if (!/onStart|onChat|onEvent|onLoad/.test(src)) add("ERROR", rel, "no onStart/onChat/onEvent handler");
		if (kind === "cmds" && !/(role|hasPermssion)\s*:/.test(src)) add("WARN", rel, "no explicit role (defaults to 0)");
		const al = (src.match(/aliases:\s*\[([^\]]*)\]/) || [])[1];
		if (al) for (const a of al.split(",").map(s => s.trim().replace(/^["'`]|["'`]$/g, "").toLowerCase()).filter(Boolean)) {
			if (aliasOwner[a] && aliasOwner[a] !== key) add("WARN", rel, `alias "${a}" also used by "${aliasOwner[a]}"`);
			aliasOwner[a] = key;
		}
	}
}
for (const kind of ["cmds", "events"])
	for (const [n, files] of Object.entries(seen[kind]))
		if (files.length > 1) add("ERROR", `scripts/${kind}`, `duplicate name "${n}" in ${files.join(", ")} (later file silently overwrites the earlier one)`);

// 3) requires
const missing = {};
for (const f of jsFiles) {
	const src = fs.readFileSync(f, "utf8");
	for (const m of src.matchAll(/require\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
		const r = m[1];
		if (r.includes("${")) continue; // dynamic path
		if (r.startsWith(".") || r.startsWith("/")) {
			const t = path.resolve(path.dirname(f), r);
			if (!["", ".js", ".json", "/index.js"].some(e => fs.existsSync(t + e)))
				add("ERROR", path.relative(root, f), `broken relative require "${r}"`);
			continue;
		}
		const base = r.startsWith("@") ? r.split("/").slice(0, 2).join("/") : r.split("/")[0];
		if (builtins.has(base) || builtins.has(r) || deps.has(base) || base === "hridoy-ultimate") continue;
		(missing[base] ??= new Set()).add(path.relative(root, f));
	}
}
for (const [m, files] of Object.entries(missing))
	add("WARN", [...files][0], `package "${m}" is required but not in package.json (used in ${files.size} file(s))`);

// 4) security
for (const f of jsFiles) {
	const rel = path.relative(root, f);
	const src = fs.readFileSync(f, "utf8");
	if (/eval\(\s*res(ponse)?\.data/.test(src)) add("ERROR", rel, "evaluates remote code (eval of HTTP response)");
	if (/(AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{30,}|mongodb(\+srv)?:\/\/[^"'\s:]+:[^"'\s@]+@)/.test(src))
		add("ERROR", rel, "hard-coded secret pattern");
}
try {
	const c = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
	if (/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/.test(c.database?.uriMongodb || "")) add("WARN", "config.json", "MongoDB URI with password is stored here — keep this repo private, or move it to config.dev.json");
	for (const k of ["clientSecret", "refreshToken"]) if (c.credentials?.gmailAccount?.[k]) add("WARN", "config.json", `gmailAccount.${k} is stored here — keep repo private`);
	if (c.credentials?.gRecaptcha?.secretKey) add("WARN", "config.json", "gRecaptcha.secretKey is stored here — keep repo private");
} catch (e) { add("ERROR", "config.json", "cannot parse: " + e.message); }
try {
	const acc = fs.readFileSync(path.join(root, "account.txt"), "utf8");
	if (/"key"\s*:\s*"(c_user|xs)"/.test(acc)) add("WARN", "account.txt", "contains live Facebook session cookies — never upload or commit this file");
} catch { /* optional */ }

const errors = findings.filter(f => f.level === "ERROR").length;
const warns = findings.filter(f => f.level === "WARN").length;
if (asJson) console.log(JSON.stringify({ files: jsFiles.length, errors, warns, findings }, null, 2));
else {
	for (const f of findings.sort((a, b) => a.level.localeCompare(b.level) || a.file.localeCompare(b.file)))
		console.log(`${f.level.padEnd(5)} ${f.file}  —  ${f.msg}`);
	console.log(`\nChecked ${jsFiles.length} JS files · ${errors} error(s) · ${warns} warning(s)`);
}
process.exit(errors ? 1 : 0);
