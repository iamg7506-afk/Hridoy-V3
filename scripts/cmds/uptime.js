const os = require("os");
const si = require("systeminformation");
const moment = require("moment-timezone");
const fs = require("fs-extra");
const path = require("path");

// canvas na thakle crash korbe na — text-only mode e fallback korbe
let createCanvas = null;
try { ({ createCanvas } = require("canvas")); }
catch (e) { console.log("[uptime] 'canvas' not installed — text-only mode"); }

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────
const TIMEZONE = "Asia/Dhaka";
const TRIGGERS = ["ut", "upt"];   // prefix charai ei likhle cholbe
const DEFAULT_THEME = "random";   // "random" ba: matrix | cyberpunk | frost | crimson | aurora | gold
const SCALE = 2;                  // 2 = sharp image, 1 = chhoto file
const SAMPLE_EVERY = 5000;        // background sampler (ms) — shudhu local CPU/RAM/net, Facebook e kono request jay na
const HISTORY_MAX = 60;           // 60 x 5s = last 5 minutes

// ─────────────────────────────────────────────
// THEMES  (up.js / upt.js er shei ek-i 6ta color system)
// ─────────────────────────────────────────────
/* THEMES:START */
const THEMES = {
  matrix: {
    label: "Matrix Green", light: false,
    bg: ["#050a07", "#07140c"], orbs: ["#00ff41", "#00cc66", "#00ffaa"],
    panel: "#ffffff", panelA: 0.05, line: "#7dffb0",
    text: "#d6ffe4", dim: "#5fb783",
    a1: "#00ff41", a2: "#00d9ff", a3: "#d946ef",
    ok: "#00ff66", warn: "#ffd400", bad: "#ff3b3b"
  },
  cyberpunk: {
    label: "Cyberpunk Neon", light: false,
    bg: ["#0b0614", "#150a24"], orbs: ["#ff2bd6", "#00f0ff", "#fcee0a"],
    panel: "#ffffff", panelA: 0.055, line: "#ff7be9",
    text: "#f6e8ff", dim: "#9a7bb5",
    a1: "#ff2bd6", a2: "#00f0ff", a3: "#fcee0a",
    ok: "#39ff88", warn: "#fcee0a", bad: "#ff3355"
  },
  frost: {
    label: "Ice Frost", light: false,
    bg: ["#050b14", "#0a1a2c"], orbs: ["#4cc9ff", "#9ae6ff", "#7b8cff"],
    panel: "#ffffff", panelA: 0.055, line: "#bfeaff",
    text: "#eaf8ff", dim: "#6a96b3",
    a1: "#4cc9ff", a2: "#7b8cff", a3: "#b4f0ff",
    ok: "#5dffb0", warn: "#ffd166", bad: "#ff5c7a"
  },
  crimson: {
    label: "Crimson Blood", light: false,
    bg: ["#0a0405", "#1a0709"], orbs: ["#ff2a3d", "#ff7a45", "#ffb703"],
    panel: "#ffffff", panelA: 0.055, line: "#ff7b88",
    text: "#ffe9ea", dim: "#a85a60",
    a1: "#ff2a3d", a2: "#ff7a45", a3: "#ffb703",
    ok: "#3dff8a", warn: "#ffd24b", bad: "#ff2a3d"
  },
  aurora: {
    label: "Aurora Violet", light: false,
    bg: ["#07061a", "#0b1730"], orbs: ["#8b5cf6", "#2dd4bf", "#f472b6"],
    panel: "#ffffff", panelA: 0.055, line: "#c4b5fd",
    text: "#eef2ff", dim: "#7c86b8",
    a1: "#8b5cf6", a2: "#2dd4bf", a3: "#f472b6",
    ok: "#34d399", warn: "#fbbf24", bad: "#fb7185"
  },
  gold: {
    label: "Royal Gold", light: false,
    bg: ["#0a0803", "#17110a"], orbs: ["#ffc233", "#ffdf8a", "#ff9f1c"],
    panel: "#ffffff", panelA: 0.05, line: "#ffd77a",
    text: "#fff6dd", dim: "#a8924f",
    a1: "#ffc233", a2: "#ff9f1c", a3: "#fff2c4",
    ok: "#7dff9b", warn: "#ffc233", bad: "#ff4d4d"
  }
};
/* THEMES:END */
const THEME_KEYS = Object.keys(THEMES);

function pickTheme(arg) {
  const a = String(arg || "").toLowerCase();
  if (THEMES[a]) return a;
  const n = parseInt(a);
  if (n >= 1 && n <= THEME_KEYS.length) return THEME_KEYS[n - 1];
  if (THEMES[DEFAULT_THEME]) return DEFAULT_THEME;
  return THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const safe = (p, ms, fallback) =>
  Promise.race([Promise.resolve(p).catch(() => fallback), new Promise((r) => setTimeout(() => r(fallback), ms))]);

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
function fmtBytes(n) {
  if (!n || n < 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}
const fmtRate = (n) => `${fmtBytes(n)}/s`;

// ─────────────────────────────────────────────
// LIVE SAMPLER  (real 5-minute history — chart gulo fake na)
// state global e rakha, jate command reload korleo history hariye na jay
// ─────────────────────────────────────────────
const G = (global.__uptimeNexus = global.__uptimeNexus || {
  hist: [], prev: null, lastTick: Date.now(), lag: 0, net: { rx: 0, tx: 0 }, timer: null
});
const cpuSnap = () => os.cpus().map((c) => ({ ...c.times }));
function coreUsage(a, b) {
  return b.map((e, i) => {
    const s = a[i];
    if (!s) return 0;
    let tot = 0;
    for (const k in e) tot += e[k] - s[k];
    const idle = e.idle - s.idle;
    return tot > 0 ? Math.max(0, Math.min(100, ((tot - idle) / tot) * 100)) : 0;
  });
}
async function sampleNet() {
  try {
    const n = await si.networkStats();
    let rx = 0, tx = 0;
    for (const i of n) { if (i.rx_sec > 0) rx += i.rx_sec; if (i.tx_sec > 0) tx += i.tx_sec; }
    G.net = { rx, tx };
  } catch {}
}
function tick() {
  const now = Date.now();
  G.lag = Math.max(0, now - G.lastTick - SAMPLE_EVERY);
  G.lastTick = now;
  const snap = cpuSnap();
  const cpu = G.prev ? avg(coreUsage(G.prev, snap)) : 0;
  G.prev = snap;
  const ram = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
  sampleNet().finally(() => {
    G.hist.push({ t: now, cpu, ram, rx: G.net.rx, tx: G.net.tx });
    if (G.hist.length > HISTORY_MAX) G.hist.shift();
  });
}
if (!G.timer) {
  G.timer = setInterval(tick, SAMPLE_EVERY);
  if (G.timer.unref) G.timer.unref();
  tick();
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
async function collect(event) {
  const t0 = Date.now();
  // real response latency (message timestamp -> now); na pele collect time
  const evTs = Number(event && event.timestamp);
  let latency = Date.now() - evTs;
  if (!(evTs > 0) || latency < 0 || latency > 60000) latency = 0;

  const a = cpuSnap();
  await sleep(250);
  const b = cpuSnap();
  const perCore = coreUsage(a, b).map((v) => Math.round(v));
  const cpuPct = Math.round(avg(perCore));

  const total = os.totalmem(), free = os.freemem(), used = total - free;
  const ramPct = Math.round((used / total) * 100);

  const [fsData, mem, temp, procs, lagNow] = await Promise.all([
    safe(si.fsSize(), 2500, []),
    safe(si.mem(), 2500, null),
    safe(si.cpuTemperature(), 2000, null),
    safe(si.processes(), 2500, null),
    new Promise((r) => { const s = Date.now(); setImmediate(() => r(Date.now() - s)); })
  ]);
  const dk = (fsData || []).find((d) => d.mount === "/" || String(d.fs).toLowerCase().startsWith("c:")) || (fsData || [])[0];
  const diskPct = dk ? Math.round(dk.use) : 0;
  const swapTotal = mem && mem.swaptotal ? mem.swaptotal : 0;
  const swapUsed = mem && mem.swapused ? mem.swapused : 0;
  const mu = process.memoryUsage();

  if (!latency) latency = Date.now() - t0;
  const pen = (x) => Math.max(0, (x - 40) / 60) * 100;
  const penLat = Math.min(Math.max(latency - 300, 0) / 1700, 1) * 100;
  const score = Math.round(Math.max(0, Math.min(100, 100 - (pen(cpuPct) * 0.3 + pen(ramPct) * 0.3 + pen(diskPct) * 0.2 + penLat * 0.2))));
  const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "D";
  const statusText = score >= 80 ? "ALL SYSTEMS NOMINAL" : score >= 65 ? "RUNNING WELL" : score >= 45 ? "UNDER LOAD" : "NEEDS ATTENTION";

  const now = Date.now();
  const hist = [...G.hist, { t: now, cpu: cpuPct, ram: ramPct, rx: G.net.rx, tx: G.net.tx }];
  const span = Math.round((now - hist[0].t) / 1000);
  const m = moment().tz(TIMEZONE);
  const botSec = process.uptime(), sysSec = os.uptime();

  return {
    score, grade, statusText,
    cpuPct, perCore, cores: os.cpus().length,
    cpuModel: os.cpus()[0].model.split("@")[0].replace(/\((R|TM|tm)\)/g, "").replace(/\s+/g, " ").trim(),
    ghz: os.cpus()[0].speed > 0 ? (os.cpus()[0].speed / 1000).toFixed(2) : null,
    temp: temp && typeof temp.main === "number" && temp.main > 0 ? Math.round(temp.main) : null,
    ramPct, ramUsed: (used / 1073741824).toFixed(1), ramFree: (free / 1073741824).toFixed(1), ramTotal: (total / 1073741824).toFixed(1),
    swapPct: swapTotal ? Math.round((swapUsed / swapTotal) * 100) : 0, swapText: swapTotal ? `${fmtBytes(swapUsed)} / ${fmtBytes(swapTotal)}` : "N/A",
    rss: fmtBytes(mu.rss), heapUsed: fmtBytes(mu.heapUsed), heapTotal: fmtBytes(mu.heapTotal),
    diskPct, diskUsed: dk ? fmtBytes(dk.used) : "N/A", diskFree: dk ? fmtBytes(dk.available != null ? dk.available : dk.size - dk.used) : "N/A", diskTotal: dk ? fmtBytes(dk.size) : "N/A",
    rx: G.net.rx, tx: G.net.tx, rxText: fmtRate(G.net.rx), txText: fmtRate(G.net.tx),
    botUp: formatUptime(botSec), sysUp: formatUptime(sysSec),
    botSince: moment().tz(TIMEZONE).subtract(botSec, "s").format("DD MMM, HH:mm"),
    sysBoot: moment().tz(TIMEZONE).subtract(sysSec, "s").format("DD MMM, HH:mm"),
    botDay: Math.round(((botSec % 86400) / 86400) * 100),
    sysStab: Math.round(Math.min(sysSec / 86400 / 30, 1) * 100),
    hist, histSpan: span, samples: G.hist.length,
    pid: process.pid, lag: Math.max(G.lag, lagNow), nodeVer: process.version,
    procCount: procs && procs.all ? procs.all : "N/A",
    latency, host: os.hostname().substring(0, 18), tz: TIMEZONE,
    dateStr: m.format("DD MMM YYYY"), timeStr: m.format("HH:mm:ss"),
    platform: os.platform(), arch: os.arch()
  };
}

const bar = (p, n = 10) => {
  const on = Math.round((Math.min(Math.max(p, 0), 100) / 100) * n);
  return "▰".repeat(on) + "▱".repeat(n - on);
};
const dotOf = (p) => (p >= 85 ? "🔴" : p >= 65 ? "🟡" : "🟢");

function styledBody(d, themeLabel) {
  const L = d.latency;
  const lat = L < 150 ? "Excellent" : L < 400 ? "Good" : L < 800 ? "Slow" : "Poor";
  const latDot = L < 400 ? "🟢" : L < 800 ? "🟡" : "🔴";
  return [
    "╭━━━━━━━━━━━━━━━━━╮",
    "     ⚡ 𝙏𝙊𝙍𝙐 𝙐𝙋𝙏𝙄𝙈𝙀  ⚡",
    "╰━━━━━━━━━━━━━━━━━╯",
    `💠 𝗛𝗲𝗮𝗹𝘁𝗵 ❯ ${d.score}/100 · Grade ${d.grade}`,
    `     ${bar(d.score)}  ${d.statusText}`,
    "",
    "┏━━━━ 𝗟𝗶𝘃𝗲 𝗠𝗲𝘁𝗿𝗶𝗰𝘀 ━━━━┓",
    `┃ ${dotOf(d.cpuPct)} 𝗖𝗣𝗨  ${bar(d.cpuPct)} ${d.cpuPct}%`,
    `┃ ${dotOf(d.ramPct)} 𝗥𝗔𝗠  ${bar(d.ramPct)} ${d.ramPct}%`,
    `┃ ${dotOf(d.diskPct)} 𝗗𝗜𝗦𝗞 ${bar(d.diskPct)} ${d.diskPct}%`,
    "┗━━━━━━━━━━━━━━━━━┛",
    "",
    "┏━━━━ 𝗦𝘆𝘀𝘁𝗲𝗺 𝗜𝗻𝗳𝗼 ━━━━┓",
    `┃ 🤖 𝗕𝗼𝘁 𝗨𝗽𝘁𝗶𝗺𝗲  ❯ ${d.botUp}`,
    `┃ 🖥️ 𝗦𝘆𝘀 𝗨𝗽𝘁𝗶𝗺𝗲  ❯ ${d.sysUp}`,
    `┃ 🧬 𝗖𝗣𝗨 𝗖𝗼𝗿𝗲𝘀  ❯ ${d.cores}${d.ghz ? ` · ${d.ghz}GHz` : ""}`,
    `┃ 💾 𝗠𝗲𝗺𝗼𝗿𝘆     ❯ ${d.ramUsed}/${d.ramTotal} GB`,
    `┃ 📡 𝗡𝗲𝘁𝘄𝗼𝗿𝗸    ❯ ↓${d.rxText} ↑${d.txText}`,
    `┃ ${latDot} 𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲   ❯ ${L}ms (${lat})`,
    `┃ 🟩 𝗡𝗼𝗱𝗲.𝗷𝘀      ❯ ${d.nodeVer}`,
    "┗━━━━━━━━━━━━━━━━━┛",
    `📅 ${d.dateStr}   ⏰ ${d.timeStr}`,
    `🎨 𝗧𝗵𝗲𝗺𝗲: ${themeLabel}  ·  𝘃1.0.0`
  ].join("\n");
}

// ─────────────────────────────────────────────
// DRAW  (pure canvas — no node deps)
// ─────────────────────────────────────────────
/* DRAW:START */
function drawNexus(c, W, H, d, T) {
  const MONO = "monospace", SANS = "sans-serif";
  const fm = (px, b) => `${b ? "bold " : ""}${px}px ${MONO}`;
  const fsn = (px, b) => `${b ? "bold " : ""}${px}px ${SANS}`;
  const PI2 = Math.PI * 2;

  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const lerpHex = (a, b, t) => {
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((x >> s) & 255) + ((((y >> s) & 255) - ((x >> s) & 255)) * t));
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  };
  const sample = (stops, t) => {
    const n = stops.length - 1, p = Math.min(Math.max(t, 0), 1) * n;
    const i = Math.min(Math.floor(p), n - 1);
    return lerpHex(stops[i], stops[i + 1] || stops[i], p - i);
  };
  const rr = (x, y, w, h, r) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  const glow = (col, b) => { c.shadowColor = col; c.shadowBlur = b; };
  const noGlow = () => { c.shadowBlur = 0; c.shadowColor = "transparent"; };
  const hgrad = (x0, x1, s0, s1) => {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, s0); g.addColorStop(1, s1); return g;
  };
  const spaced = (text, x, y, sp, align = "left") => {
    const chars = [...String(text)];
    const ws = chars.map((ch) => c.measureText(ch).width);
    const tot = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let cx = align === "center" ? x - tot / 2 : align === "right" ? x - tot : x;
    c.textAlign = "left";
    chars.forEach((ch, i) => { c.fillText(ch, cx, y); cx += ws[i] + sp; });
  };
  const levelCols = (p, base) => (p >= 85 ? [T.bad, T.bad] : p >= 65 ? [T.warn, lerpHex(T.warn, T.bad, 0.4)] : base);
  const statusOf = (p) => (p >= 85 ? ["CRITICAL", T.bad] : p >= 65 ? ["ELEVATED", T.warn] : ["NORMAL", T.ok]);

  /* ---------- background: aurora mesh ---------- */
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, T.bg[0]); bg.addColorStop(1, T.bg[1]);
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  [[240, 150, 640, T.orbs[0], 0.26], [1060, 110, 580, T.orbs[1], 0.2], [700, H + 20, 760, T.orbs[2], 0.19]].forEach(([ox, oy, or, col, a]) => {
    const g = c.createRadialGradient(ox, oy, 0, ox, oy, or);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  c.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) { c.strokeStyle = rgba(T.line, 0.035); c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke(); }
  for (let y = 0; y <= H; y += 64) { c.strokeStyle = rgba(T.line, 0.035 + (y / H) * 0.03); c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke(); }
  for (let i = 0; i < 260; i++) {
    const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1, ry = (Math.sin(i * 78.233) * 12345.6789) % 1;
    c.fillStyle = rgba(T.text, 0.05 + Math.abs((Math.sin(i * 3.1) * 0.5)) * 0.1);
    c.fillRect(Math.abs(rx) * W, Math.abs(ry) * H, 1.4, 1.4);
  }
  const vg = c.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, W * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)");
  c.fillStyle = vg; c.fillRect(0, 0, W, H);

  /* ---------- glass card with gradient border ---------- */
  const card = (x, y, w, h, r = 22, notch = true) => {
    rr(x, y, w, h, r); c.fillStyle = rgba(T.panel, T.panelA); c.fill();
    const hg = c.createLinearGradient(0, y, 0, y + h);
    hg.addColorStop(0, rgba("#ffffff", 0.07)); hg.addColorStop(1, rgba("#ffffff", 0));
    rr(x, y, w, h, r); c.fillStyle = hg; c.fill();
    const bgd = c.createLinearGradient(x, y, x + w, y + h);
    bgd.addColorStop(0, rgba(T.a1, 0.5)); bgd.addColorStop(0.5, rgba(T.line, 0.1)); bgd.addColorStop(1, rgba(T.a2, 0.38));
    rr(x + 0.5, y + 0.5, w - 1, h - 1, r); c.strokeStyle = bgd; c.lineWidth = 1.2; c.stroke();
    if (notch) { rr(x + 22, y - 1, 46, 3, 1.5); c.fillStyle = hgrad(x + 22, x + 68, T.a1, T.a2); c.fill(); }
  };
  const cardTitle = (t, x, y) => {
    c.fillStyle = hgrad(x, x + 10, T.a1, T.a2);
    c.beginPath(); c.arc(x + 4, y - 4, 4, 0, PI2); c.fill();
    c.font = fsn(11, true); c.fillStyle = T.dim; spaced(t, x + 16, y, 2.2);
  };
  const tag = (t, rightX, y, col) => { c.font = fsn(10, true); c.fillStyle = col; spaced(t, rightX, y, 1.5, "right"); };
  const chip = (text, rightX, y, col, dot, blink) => {
    c.font = fm(12, true);
    const w = c.measureText(text).width + (dot ? 44 : 28), x = rightX - w;
    rr(x, y, w, 28, 14); c.fillStyle = rgba(col, 0.12); c.fill();
    c.strokeStyle = rgba(col, 0.5); c.lineWidth = 1; c.stroke();
    if (dot) {
      glow(col, blink ? 10 : 2); c.fillStyle = blink ? col : rgba(col, 0.4);
      c.beginPath(); c.arc(x + 16, y + 14, 4, 0, PI2); c.fill(); noGlow();
    }
    c.textAlign = "left"; c.fillStyle = col; c.fillText(text, x + (dot ? 28 : 14), y + 19);
    return x;
  };
  const pctText = (txt, x, y, size, cols) => {
    c.textAlign = "left"; c.font = fsn(size, true);
    glow(cols[1], 14); c.fillStyle = hgrad(x, x + size * 1.6, cols[0], cols[1]); c.fillText(String(txt), x, y); noGlow();
    const w = c.measureText(String(txt)).width;
    c.font = fsn(size * 0.34, true); c.fillStyle = T.dim; c.fillText("%", x + w + 4, y);
  };
  const kv = (k, v, x, y, rightX) => {
    c.font = fsn(10, true); c.fillStyle = T.dim; spaced(k, x, y, 1.6);
    c.font = fm(13, true); c.fillStyle = T.text; c.textAlign = "right"; c.fillText(String(v), rightX, y);
  };

  /* ---------- gradient arcs ---------- */
  const arcGrad = (cx, cy, r, th, a0, a1, stops) => {
    const segs = Math.max(2, Math.ceil(((a1 - a0) / PI2) * 110));
    c.lineCap = "butt"; c.lineWidth = th;
    for (let i = 0; i < segs; i++) {
      c.strokeStyle = sample(stops, i / (segs - 1));
      c.beginPath();
      c.arc(cx, cy, r, a0 + ((a1 - a0) * i) / segs, a0 + ((a1 - a0) * (i + 1)) / segs + 0.012);
      c.stroke();
    }
  };
  const arcMeter = (cx, cy, r, th, a0, sweep, pct, c1, c2, ticks, tickR) => {
    if (ticks) {
      for (let i = 0; i <= ticks; i++) {
        const t = i / ticks, ang = a0 + sweep * t, major = i % 9 === 0;
        const r0 = r + th / 2 + 7, r1 = r0 + (major ? 9 : 5);
        c.strokeStyle = t * 100 <= pct ? lerpHex(c1, c2, t) : rgba(T.text, 0.14);
        c.lineWidth = 2; c.lineCap = "round";
        c.beginPath(); c.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
        c.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); c.stroke();
      }
    }
    c.lineCap = "round"; c.lineWidth = th; c.strokeStyle = rgba(T.text, 0.08);
    c.beginPath(); c.arc(cx, cy, r, a0, a0 + sweep); c.stroke();
    const vs = (Math.max(pct, 0.8) / 100) * sweep, a1 = a0 + vs;
    c.save(); glow(c2, 22); c.strokeStyle = rgba(c2, 0.4); c.lineWidth = th * 0.6; c.lineCap = "butt";
    c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke(); c.restore();
    arcGrad(cx, cy, r, th, a0, a1, [c1, c2]);
    c.fillStyle = c1; c.beginPath(); c.arc(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, th / 2, 0, PI2); c.fill();
    const ex = cx + Math.cos(a1) * r, ey = cy + Math.sin(a1) * r;
    c.fillStyle = c2; c.beginPath(); c.arc(ex, ey, th / 2, 0, PI2); c.fill();
    glow("#ffffff", 10); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(ex, ey, th * 0.2, 0, PI2); c.fill(); noGlow();
    c.lineCap = "butt";
  };

  /* ---------- sparkline / segments ---------- */
  const spark = (x, y, w, h, vals, max, c1, c2) => {
    if (!vals || vals.length < 2) return false;
    const m = max || Math.max(1, ...vals), n = vals.length, step = w / (n - 1);
    const co = vals.map((v, i) => [x + i * step, y + h - Math.min(v / m, 1) * h]);
    const path = () => {
      c.beginPath(); c.moveTo(co[0][0], co[0][1]);
      for (let i = 1; i < n; i++) {
        const mx = (co[i - 1][0] + co[i][0]) / 2, my = (co[i - 1][1] + co[i][1]) / 2;
        c.quadraticCurveTo(co[i - 1][0], co[i - 1][1], mx, my);
      }
      c.lineTo(co[n - 1][0], co[n - 1][1]);
    };
    path(); c.lineTo(co[n - 1][0], y + h); c.lineTo(co[0][0], y + h); c.closePath();
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, rgba(c1, 0.34)); g.addColorStop(1, rgba(c1, 0));
    c.fillStyle = g; c.fill();
    path(); glow(c1, 6); c.strokeStyle = hgrad(x, x + w, c1, c2); c.lineWidth = 2.2; c.lineJoin = "round"; c.stroke(); noGlow();
    const [lx, ly] = co[n - 1];
    glow(c2, 10); c.fillStyle = c2; c.beginPath(); c.arc(lx, ly, 3.6, 0, PI2); c.fill(); noGlow();
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(lx, ly, 1.4, 0, PI2); c.fill();
    return true;
  };
  const noData = (x, y, msg) => { c.font = fm(11); c.fillStyle = T.dim; c.textAlign = "left"; c.fillText(msg, x, y); };
  const segBar = (x, y, w, h, pct, n, c1, c2) => {
    const gap = 4, sw = (w - gap * (n - 1)) / n, on = Math.round((pct / 100) * n);
    for (let i = 0; i < n; i++) {
      rr(x + i * (sw + gap), y, sw, h, 4);
      c.fillStyle = i < on ? sample([c1, c2], i / (n - 1)) : rgba(T.text, 0.08); c.fill();
    }
    if (on > 0) { c.save(); glow(c2, 12); rr(x + (on - 1) * (sw + gap), y, sw, h, 4); c.fillStyle = rgba(c2, 0.5); c.fill(); c.restore(); }
  };
  const thinBar = (x, y, w, h, pct, c1, c2) => {
    rr(x, y, w, h, h / 2); c.fillStyle = rgba(T.text, 0.09); c.fill();
    const fw = Math.max((pct / 100) * w, pct > 0 ? h : 0);
    if (fw > 0) { rr(x, y, fw, h, h / 2); glow(c2, 8); c.fillStyle = hgrad(x, x + fw, c1, c2); c.fill(); noGlow(); }
  };

  /* ================= HEADER ================= */
  card(32, 24, 1216, 52, 26, false);
  c.save(); glow(T.a1, 14); arcGrad(62, 50, 13, 3.5, 0, PI2 * 0.85, [T.a1, T.a2, T.a3]); c.restore();
  arcGrad(62, 50, 13, 3.5, 0, PI2 * 0.85, [T.a1, T.a2, T.a3]);
  glow(T.a2, 10); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(62, 50, 3.4, 0, PI2); c.fill(); noGlow();
  c.font = fsn(19, true); c.fillStyle = T.text; spaced("UPTIME NEXUS", 90, 57, 4);
  chip("LIVE", 388, 36, T.ok, true, Math.floor(Date.now() / 600) % 2 === 0);
  let rx0 = 1232;
  rx0 = chip(d.timeStr, rx0, 36, T.text, false) - 8;
  rx0 = chip(d.dateStr, rx0, 36, T.text, false) - 8;
  chip(`${d.host} · ${d.platform}/${d.arch}`, rx0, 36, T.dim, false);

  /* ================= ROW A ================= */
  const AY = 96, AH = 280;

  // ---- hero: health gauge ----
  {
    const x = 32, w = 380, y = AY, h = AH;
    card(x, y, w, h); cardTitle("SYSTEM HEALTH", x + 24, y + 34);
    const [hs, hc] = d.score >= 65 ? ["LIVE", T.ok] : d.score >= 45 ? ["WATCH", T.warn] : ["ALERT", T.bad];
    tag(hs, x + w - 24, y + 34, hc);
    const cx = x + w / 2, cy = y + 150;
    const cols = d.score >= 65 ? [T.a1, T.a2] : d.score >= 45 ? [T.warn, lerpHex(T.warn, T.bad, 0.4)] : [T.bad, T.bad];
    c.beginPath(); c.arc(cx, cy, 64, 0, PI2); c.fillStyle = rgba(T.text, 0.035); c.fill();
    arcMeter(cx, cy, 86, 18, Math.PI * 0.75, Math.PI * 1.5, d.score, cols[0], cols[1], 54);
    c.textAlign = "center"; c.font = fsn(62, true);
    glow(cols[1], 18); c.fillStyle = T.text; c.fillText(String(d.score), cx, cy + 16); noGlow();
    c.font = fsn(10, true); c.fillStyle = T.dim; spaced("HEALTH INDEX", cx, cy + 38, 3, "center");
    rr(cx - 50, cy + 56, 100, 28, 14); c.fillStyle = rgba(cols[0], 0.14); c.fill();
    c.strokeStyle = hgrad(cx - 50, cx + 50, cols[0], cols[1]); c.lineWidth = 1.5; c.stroke();
    c.font = fsn(12, true); c.fillStyle = cols[0]; spaced(`GRADE ${d.grade}`, cx, cy + 75, 2, "center");
    c.font = fsn(12, true); c.fillStyle = hc; spaced(d.statusText, cx, y + h - 20, 3, "center");
  }

  // ---- CPU ----
  {
    const x = 428, w = 400, y = AY, h = AH;
    card(x, y, w, h); cardTitle("CPU", x + 24, y + 34);
    const [sw, sc] = statusOf(d.cpuPct); tag(sw, x + w - 24, y + 34, sc);
    pctText(d.cpuPct, x + 24, y + 108, 64, levelCols(d.cpuPct, [T.a1, T.a2]));
    const hv = d.hist.map((p) => p.cpu);
    if (!spark(x + 214, y + 62, w - 238, 66, hv, 100, T.a1, T.a2)) noData(x + 214, y + 100, "collecting...");
    c.font = fm(12); c.fillStyle = T.dim; c.textAlign = "left";
    c.fillText(d.cpuModel.substring(0, 34), x + 24, y + 144);
    c.fillText(`${d.cores} CORES${d.ghz ? ` · ${d.ghz}GHz` : ""}${d.temp != null ? ` · ${d.temp}°C` : ""}`, x + 24, y + 162);
    c.font = fsn(10, true); c.fillStyle = T.dim; spaced("PER-CORE LOAD", x + 24, y + 188, 2.2);
    let list = d.perCore.slice();
    if (list.length > 16) {
      const k = Math.ceil(list.length / 16), g = [];
      for (let i = 0; i < list.length; i += k) g.push(avg(list.slice(i, i + k)));
      list = g;
    }
    const n = list.length, gp = 6, bw = (w - 48 - gp * (n - 1)) / n, base = y + h - 20, bh = 62;
    list.forEach((p, i) => {
      const bx = x + 24 + i * (bw + gp), pc = Math.round(p), col = levelCols(pc, [T.a1, T.a2]);
      rr(bx, base - bh, bw, bh, Math.min(6, bw / 2)); c.fillStyle = rgba(T.text, 0.07); c.fill();
      const lh = Math.max((pc / 100) * bh, 4);
      c.save(); rr(bx, base - bh, bw, bh, Math.min(6, bw / 2)); c.clip();
      const gg = c.createLinearGradient(0, base - lh, 0, base);
      gg.addColorStop(0, col[1]); gg.addColorStop(1, rgba(col[0], 0.6));
      c.fillStyle = gg; c.fillRect(bx, base - lh, bw, lh);
      c.fillStyle = "rgba(255,255,255,0.3)"; c.fillRect(bx, base - lh, bw, 2);
      c.restore();
    });
  }

  // ---- RAM ----
  {
    const x = 844, w = 404, y = AY, h = AH;
    card(x, y, w, h); cardTitle("MEMORY", x + 24, y + 34);
    const [sw, sc] = statusOf(d.ramPct); tag(sw, x + w - 24, y + 34, sc);
    const cols = levelCols(d.ramPct, [T.a2, T.a3]);
    pctText(d.ramPct, x + 24, y + 108, 64, cols);
    kv("USED", `${d.ramUsed} GB`, x + 214, y + 70, x + w - 24);
    kv("FREE", `${d.ramFree} GB`, x + 214, y + 94, x + w - 24);
    kv("TOTAL", `${d.ramTotal} GB`, x + 214, y + 118, x + w - 24);
    segBar(x + 24, y + 144, w - 48, 24, d.ramPct, 26, cols[0], cols[1]);
    c.font = fsn(10, true); c.fillStyle = T.dim; spaced("SWAP", x + 24, y + 208, 2);
    thinBar(x + 80, y + 200, w - 80 - 24 - 130, 8, d.swapPct, T.a3, T.a1);
    c.font = fm(12, true); c.fillStyle = T.text; c.textAlign = "right"; c.fillText(d.swapText, x + w - 24, y + 209);
    c.font = fsn(10, true); c.fillStyle = T.dim; spaced("BOT", x + 24, y + 244, 2);
    c.font = fm(12); c.fillStyle = T.text; c.textAlign = "left";
    c.fillText(`RSS ${d.rss} · HEAP ${d.heapUsed}/${d.heapTotal}`, x + 80, y + 245);
  }

  /* ================= ROW B ================= */
  const BY = 392, BH = 160, CW = 292, CG = 16;

  // ---- disk ----
  {
    const x = 32, y = BY, w = CW;
    card(x, y, w, BH); cardTitle("STORAGE", x + 24, y + 34);
    const [sw, sc] = statusOf(d.diskPct); tag(sw, x + w - 24, y + 34, sc);
    const cols = levelCols(d.diskPct, [T.a3, T.a1]);
    const cx = x + 76, cy = y + 100;
    arcMeter(cx, cy, 38, 12, -Math.PI / 2, PI2 - 0.0001, d.diskPct, cols[0], cols[1], 0);
    c.textAlign = "center"; c.font = fsn(22, true); c.fillStyle = T.text; c.fillText(`${d.diskPct}%`, cx, cy + 8);
    kv("USED", d.diskUsed, x + 146, y + 76, x + w - 22);
    kv("FREE", d.diskFree, x + 146, y + 102, x + w - 22);
    kv("TOTAL", d.diskTotal, x + 146, y + 128, x + w - 22);
  }

  // ---- network ----
  {
    const x = 32 + CW + CG, y = BY, w = CW;
    card(x, y, w, BH); cardTitle("NETWORK", x + 24, y + 34);
    tag("LIVE I/O", x + w - 24, y + 34, T.a2);
    [["DOWNLOAD", d.rxText, "rx", T.a1, T.a2, 50], ["UPLOAD", d.txText, "tx", T.a2, T.a3, 104]].forEach(([lab, val, key, c1, c2, off]) => {
      const rx = x + 16, ry = y + off, rw = w - 32, rh = 46;
      rr(rx, ry, rw, rh, 12); c.fillStyle = rgba(T.text, 0.045); c.fill();
      c.save(); rr(rx, ry, rw, rh, 12); c.clip();
      spark(rx + 118, ry + 8, rw - 130, rh - 14, d.hist.map((p) => p[key] || 0), Math.max(1, ...d.hist.map((p) => p[key] || 0)), c1, c2);
      c.restore();
      c.font = fsn(9, true); c.fillStyle = T.dim; spaced(lab, rx + 12, ry + 17, 1.6);
      c.font = fm(15, true); c.fillStyle = T.text; c.textAlign = "left"; c.fillText(val, rx + 12, ry + 37);
    });
  }

  // ---- bot uptime ----
  const uptCard = (x, title, big, sub, label, pct, c1, c2) => {
    const y = BY, w = CW;
    card(x, y, w, BH); cardTitle(title, x + 24, y + 34);
    c.textAlign = "left"; c.font = fsn(34, true);
    glow(c2, 14); c.fillStyle = hgrad(x + 24, x + 24 + 190, c1, c2); c.fillText(big, x + 24, y + 86); noGlow();
    c.font = fm(12); c.fillStyle = T.dim; c.fillText(sub, x + 24, y + 108);
    c.font = fsn(10, true); c.fillStyle = T.dim; spaced(label, x + 24, y + 134, 2);
    c.font = fm(12, true); c.fillStyle = T.text; c.textAlign = "right"; c.fillText(`${pct}%`, x + w - 24, y + 135);
    thinBar(x + 24, y + 144, w - 48, 6, pct, c1, c2);
  };
  uptCard(32 + (CW + CG) * 2, "BOT UPTIME", d.botUp, `SINCE ${d.botSince}`, "DAY PROGRESS", d.botDay, T.a1, T.a2);
  uptCard(32 + (CW + CG) * 3, "SYSTEM UPTIME", d.sysUp, `BOOT ${d.sysBoot}`, "30D STABILITY", d.sysStab, T.a2, T.a3);

  /* ================= ROW C ================= */
  const CY = 568, CH = 160;

  // ---- trend ----
  {
    const x = 32, w = 600, y = CY;
    card(x, y, w, CH); cardTitle("LIVE TREND", x + 24, y + 34);
    c.font = fsn(10, true); c.textAlign = "left";
    c.fillStyle = T.a2; c.beginPath(); c.arc(x + w - 124, y + 30, 4, 0, PI2); c.fill();
    c.fillStyle = T.dim; spaced("RAM", x + w - 114, y + 34, 1.6);
    c.fillStyle = T.a1; c.beginPath(); c.arc(x + w - 66, y + 30, 4, 0, PI2); c.fill();
    c.fillStyle = T.dim; spaced("CPU", x + w - 56, y + 34, 1.6);
    const gx = x + 24, gy = y + 54, gw = w - 48, gh = 72;
    c.strokeStyle = rgba(T.text, 0.09); c.lineWidth = 1; c.setLineDash([3, 5]);
    [0, 0.5, 1].forEach((t) => { c.beginPath(); c.moveTo(gx, gy + gh * t); c.lineTo(gx + gw, gy + gh * t); c.stroke(); });
    c.setLineDash([]);
    if (d.hist.length < 2) noData(gx + 8, gy + gh / 2 + 4, "> collecting live samples...");
    else {
      spark(gx, gy, gw, gh, d.hist.map((p) => p.ram), 100, T.a2, T.a3);
      spark(gx, gy, gw, gh, d.hist.map((p) => p.cpu), 100, T.a1, lerpHex(T.a1, T.warn, 0.5));
    }
    c.font = fm(10); c.fillStyle = T.dim;
    const s = d.histSpan, lab = s < 90 ? `-${s}s` : `-${Math.round(s / 60)}m`;
    c.textAlign = "left"; c.fillText(lab, gx, y + CH - 12);
    c.textAlign = "right"; c.fillText("NOW", gx + gw, y + CH - 12);
    c.textAlign = "center"; c.fillText(`${d.samples} live samples · 100% / 50% / 0%`, gx + gw / 2, y + CH - 12);
  }

  // ---- process ----
  {
    const x = 32 + 600 + CG, w = 300, y = CY;
    card(x, y, w, CH); cardTitle("BOT PROCESS", x + 24, y + 34);
    const items = [["PID", d.pid], ["NODE", d.nodeVer], ["RSS", d.rss], ["HEAP", d.heapUsed], ["LOOP LAG", `${d.lag}ms`], ["PROCS", d.procCount]];
    items.forEach(([k, v], i) => {
      const col = i % 2, row = Math.floor(i / 2), px = x + 24 + col * 132, py = y + 62 + row * 34;
      c.fillStyle = hgrad(px - 8, px - 5, T.a1, T.a2); rr(px - 10, py - 9, 3, 28, 1.5); c.fill();
      c.font = fsn(9, true); c.fillStyle = T.dim; spaced(k, px, py, 1.8);
      c.font = fm(14, true); c.fillStyle = T.text; c.textAlign = "left"; c.fillText(String(v).substring(0, 11), px, py + 18);
    });
  }

  // ---- response ----
  {
    const x = 32 + 600 + CG + 300 + CG, w = 284, y = CY;
    card(x, y, w, CH); cardTitle("RESPONSE", x + 24, y + 34);
    const L = d.latency;
    const [st, sc] = L < 150 ? ["EXCELLENT", T.ok] : L < 400 ? ["GOOD", T.ok] : L < 800 ? ["SLOW", T.warn] : ["POOR", T.bad];
    tag(st, x + w - 24, y + 34, sc);
    c.textAlign = "left"; c.font = fsn(46, true);
    glow(sc, 14); c.fillStyle = T.text; c.fillText(String(L), x + 24, y + 94); noGlow();
    const nw = c.measureText(String(L)).width;
    c.font = fsn(15, true); c.fillStyle = T.dim; c.fillText("ms", x + 24 + nw + 6, y + 94);
    const bx = x + 24, bw = w - 48, by = y + 114;
    const sg = c.createLinearGradient(bx, 0, bx + bw, 0);
    sg.addColorStop(0, T.ok); sg.addColorStop(0.5, T.warn); sg.addColorStop(1, T.bad);
    rr(bx, by, bw, 8, 4); c.fillStyle = rgba(T.text, 0.08); c.fill();
    c.save(); rr(bx, by, bw, 8, 4); c.clip(); c.globalAlpha = 0.9; c.fillStyle = sg; c.fillRect(bx, by, bw, 8); c.restore();
    const mx = bx + Math.min(L / 1000, 1) * bw;
    glow("#ffffff", 10); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(mx, by + 4, 7, 0, PI2); c.fill(); noGlow();
    c.fillStyle = sc; c.beginPath(); c.arc(mx, by + 4, 3.4, 0, PI2); c.fill();
    c.font = fm(10); c.fillStyle = T.dim; c.textAlign = "left"; c.fillText("0", bx, y + 148);
    c.textAlign = "center"; c.fillText("500", bx + bw / 2, y + 148);
    c.textAlign = "right"; c.fillText("1000ms", bx + bw, y + 148);
  }

  /* ---------- footer ---------- */
  c.font = fm(11); c.fillStyle = rgba(T.text, 0.38); c.textAlign = "center";
  c.fillText(`NEXUS v1.0.0  •  HR_ID_OY  •  ${d.tz}  •  AUTO-SAMPLING EVERY 5s`, W / 2, 752);
}
/* DRAW:END */

// ─────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────
module.exports = {
  config: {
    shortDescription: "Uptime (System)",
    name: "uptime",
    version: "1.0.0",
    author: "HR ID OY",
    countDown: 10,
    role: 0,
    category: "System",
    guide: { en: "{pn} [theme | list]\nThemes: " + THEME_KEYS.join(", ") }
  },

  onStart: async function ({ message, event, args = [] }) {
    if ((args[0] || "").toLowerCase() === "list") {
      const list = THEME_KEYS.map((k, i) => `${i + 1}. ${k} — ${THEMES[k].label}`).join("\n");
      return message.reply(`🎨 Available themes:\n${list}\n\nUse: uptime <name | number>`);
    }
    await sendSystemInfo(message, event, args[0]);
  },

  onChat: async function ({ message, event }) {
    const body = event.body?.toLowerCase().trim();
    if (!body) return;
    if (TRIGGERS.includes(body)) await sendSystemInfo(message, event);
  }
};

async function sendSystemInfo(message, event, themeArg) {
  try {
    const d = await collect(event);
    const themeKey = pickTheme(themeArg);
    const body = styledBody(d, THEMES[themeKey].label);

    if (createCanvas) {
      try {
        const W = 1280, H = 780;
        const cv = createCanvas(W * SCALE, H * SCALE);
        const ctx = cv.getContext("2d");
        ctx.scale(SCALE, SCALE);
        drawNexus(ctx, W, H, d, THEMES[themeKey]);

        const imagePath = path.join(__dirname, "cache", `${Date.now()}_system.png`);
        await fs.ensureDir(path.dirname(imagePath));
        await fs.writeFile(imagePath, cv.toBuffer("image/png"));
        await message.reply({ body, attachment: fs.createReadStream(imagePath) });
        fs.unlink(imagePath, (err) => { if (err) console.error("Cache clean up failed:", err); });
        return;
      } catch (imgErr) {
        console.error("Render failed, sending text only:", imgErr);
      }
    }

    await message.reply(body);
  } catch (err) {
    console.error("SYSTEM COMMAND ERROR:", err);
    return message.reply("❌ Oops! Something went wrong, please try again later.");
  }
}
