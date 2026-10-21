#!/usr/bin/env node
"use strict";
// usage: npm run restore -- data/backups/toru-backup-XXXX.json.gz   (stop the bot first)
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const file = process.argv[2];
if (!file) { console.log("usage: node tools/restore.js <backup.json.gz>"); process.exit(1); }
const payload = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString());
const root = path.resolve(__dirname, "..");
const merge = (n, o) => { // keep current secrets where the backup has [REDACTED]
	if (n === "[REDACTED]") return o;
	if (n && typeof n === "object" && !Array.isArray(n)) { const r = {}; for (const k of Object.keys(n)) r[k] = merge(n[k], o ? o[k] : undefined); return r; }
	return n;
};
for (const [rel, b64] of Object.entries(payload.files)) {
	if (rel === "database-export.json") { fs.writeFileSync(path.join(root, "data", "restored-database-export.json"), Buffer.from(b64, "base64")); console.log("• database export saved to data/restored-database-export.json (sqlite file is restored directly)"); continue; }
	const dest = path.join(root, rel); fs.mkdirSync(path.dirname(dest), { recursive: true });
	let buf = Buffer.from(b64, "base64");
	if (rel === "config.json" && payload.redacted && fs.existsSync(dest)) buf = Buffer.from(JSON.stringify(merge(JSON.parse(buf), JSON.parse(fs.readFileSync(dest, "utf8"))), null, 2));
	if (fs.existsSync(dest)) fs.copyFileSync(dest, dest + ".before-restore");
	fs.writeFileSync(dest, buf); console.log("✔", rel);
}
console.log("Done. Start the bot again.");
