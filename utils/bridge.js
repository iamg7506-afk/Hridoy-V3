"use strict";
/** Telegram / Discord control bridge + alert forwarding. Only configured admins are answered. */
const fs = require("fs");
const path = require("path");
const axios = require("axios");
let ctx = {}, running = false, stopped = false;
const startedAt = Date.now();

function cfg() { return (global.GoatBot.config.bridge) || {}; }
const trunc = (s, n = 3800) => (s.length > n ? s.slice(0, n) + "\n…" : s);

async function notify(text) {
	const t = cfg().telegram || {}, d = cfg().discord || {};
	const jobs = [];
	if (t.enable && t.botToken && t.forwardAlerts !== false)
		for (const id of t.adminChatIds || []) jobs.push(axios.post(`https://api.telegram.org/bot${t.botToken}/sendMessage`, { chat_id: id, text: trunc(text) }, { timeout: 15000 }));
	if (d.enable && d.webhookUrl) jobs.push(axios.post(d.webhookUrl, { content: trunc(text, 1900) }, { timeout: 15000 }));
	await Promise.allSettled(jobs);
}

function fmtUp(ms) { const s = Math.floor(ms / 1000); return `${Math.floor(s / 86400)}d ${Math.floor(s % 86400 / 3600)}h ${Math.floor(s % 3600 / 60)}m`; }

async function handle(text) {
	const [cmd, ...a] = String(text).trim().replace(/^[\/!]/, "").split(/\s+/);
	const G = global.GoatBot, cs = require("./configStore.js");
	switch ((cmd || "").toLowerCase().replace(/@.*/, "")) {
		case "start": case "help":
			return "Commands: status, threads [n], say <threadID> <text>, maintenance on|off, reload <command>, backup, ratelimit [cmd max sec], logs [n], restart";
		case "status": {
			let two = "off";
			try { const s = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/twoIdModeState.json"), "utf8")); two = s ? s.activeAccount : "off"; } catch (_) { two = G.config.twoIdMode && G.config.twoIdMode.enable ? "primary" : "off"; }
			const b = require("./autoBackup.js").status();
			return [`🤖 Bot ${global.botID || "?"}`, `⏱ uptime ${fmtUp(Date.now() - startedAt)}`, `💾 RAM ${(process.memoryUsage().rss / 1048576).toFixed(0)} MB`, `🗄 db ${G.config.database.type} | threads ${(global.db.allThreadData || []).length} | users ${(global.db.allUserData || []).length}`, `🧩 commands ${G.commands.size} | events ${G.eventCommands.size}`, `👥 two-ID: ${two}`, `🛠 maintenance ${G.config.maintenanceMode && G.config.maintenanceMode.enable ? "ON" : "off"}`, `🗂 last backup ${b.at ? new Date(b.at).toISOString() + " " + (b.ok ? "OK" : "FAILED") : "none yet"}`].join("\n");
		}
		case "threads": {
			const n = Math.min(+a[0] || 15, 40);
			return (global.db.allThreadData || []).filter(t => t.isGroup).slice(0, n).map(t => `${t.threadID} — ${t.threadName || "?"}`).join("\n") || "no groups";
		}
		case "say": {
			if (!a[0] || !a[1]) return "usage: say <threadID> <text>";
			await ctx.api.sendMessage(a.slice(1).join(" "), a[0]);
			return "sent ✅";
		}
		case "maintenance": {
			if (!["on", "off"].includes(a[0])) return "usage: maintenance on|off";
			G.config.maintenanceMode = Object.assign({ allowAdminBot: true }, G.config.maintenanceMode, { enable: a[0] === "on" });
			cs.saveConfig();
			return `maintenance ${a[0]}`;
		}
		case "reload": {
			if (!a[0]) return "usage: reload <command file name>";
			const c = ctx.current, r = global.utils.loadScripts("cmds", a[0].replace(/\.js$/, ""), global.utils.log, G.configCommands, c.api, c.threadModel, c.userModel, c.dashBoardModel, c.globalModel, c.threadsData, c.usersData, c.dashBoardData, c.globalData, (k, ...x) => [k, ...x].join(" "));
			return r.status === "success" ? "reloaded ✅" : "failed: " + (r.error && r.error.message);
		}
		case "backup": { const r = await require("./autoBackup.js").run("bridge"); return `${r.ok ? "✅" : "❌"} ${r.file} ${r.info}`; }
		case "ratelimit": {
			const rl = G.config.rateLimit = G.config.rateLimit || { enable: true, perCommand: {} };
			if (!a[0]) return JSON.stringify({ default: rl.default, perCommand: rl.perCommand }, null, 1);
			if (a.length < 3) return "usage: ratelimit <cmd> <maxUses> <perSeconds>";
			rl.perCommand = rl.perCommand || {}; rl.perCommand[a[0].toLowerCase()] = { maxUses: +a[1], perSeconds: +a[2] };
			cs.saveConfig(); return "saved ✅";
		}
		case "logs": {
			const n = Math.min(+a[0] || 20, 60);
			try { return trunc(fs.readFileSync(path.join(process.cwd(), "logs", "error.log"), "utf8").trim().split("\n").slice(-n).join("\n")); } catch (_) { return "no error log"; }
		}
		case "restart": setTimeout(() => process.exit(2), 1000); return "restarting…";
		default: return "unknown command, send help";
	}
}

async function telegramLoop() {
	let offset = 0;
	while (!stopped) {
		const t = cfg().telegram || {};
		if (!t.enable || !t.botToken) { await new Promise(r => setTimeout(r, 15000)); continue; }
		try {
			const res = await axios.get(`https://api.telegram.org/bot${t.botToken}/getUpdates`, { params: { offset, timeout: t.pollTimeoutSeconds || 25 }, timeout: ((t.pollTimeoutSeconds || 25) + 10) * 1000 });
			for (const u of res.data.result || []) {
				offset = u.update_id + 1;
				const m = u.message; if (!m || !m.text) continue;
				if (!(t.adminChatIds || []).map(String).includes(String(m.chat.id)) && !(t.adminChatIds || []).map(String).includes(String(m.from && m.from.id))) continue;
				let out; try { out = await handle(m.text); } catch (e) { out = "error: " + e.message; }
				await axios.post(`https://api.telegram.org/bot${t.botToken}/sendMessage`, { chat_id: m.chat.id, text: trunc(out) }, { timeout: 15000 }).catch(() => {});
			}
		} catch (e) { await new Promise(r => setTimeout(r, 10000)); }
	}
}

async function discordLoop() {
	let after = null;
	while (!stopped) {
		const d = cfg().discord || {};
		if (!d.enable || !d.botToken || !d.channelId) { await new Promise(r => setTimeout(r, 15000)); continue; }
		const H = { Authorization: `Bot ${d.botToken}` };
		try {
			const res = await axios.get(`https://discord.com/api/v10/channels/${d.channelId}/messages`, { headers: H, params: after ? { after, limit: 20 } : { limit: 1 }, timeout: 15000 });
			const msgs = (res.data || []).sort((x, y) => (BigInt(x.id) > BigInt(y.id) ? 1 : -1));
			for (const m of msgs) {
				const first = after === null; after = m.id;
				if (first || !m.content || !m.content.startsWith("!") || m.author.bot) continue; // first poll only sets the cursor
				if (!(d.adminUserIds || []).map(String).includes(String(m.author.id))) continue;
				let out; try { out = await handle(m.content); } catch (e) { out = "error: " + e.message; }
				await axios.post(`https://discord.com/api/v10/channels/${d.channelId}/messages`, { content: trunc(out, 1900) }, { headers: H, timeout: 15000 }).catch(() => {});
			}
			if (after === null) after = "0";
		} catch (e) { /* rate limited / network: try again */ }
		await new Promise(r => setTimeout(r, Math.max(3, d.pollIntervalSeconds || 6) * 1000));
	}
}

function start(context) {
	ctx = Object.assign(ctx, context);
	if (running) return true;
	running = true;
	telegramLoop().catch(() => {});
	discordLoop().catch(() => {});
	return true;
}

module.exports = { start, notify, handle, stop: () => { stopped = true; } };
