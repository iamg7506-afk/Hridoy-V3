const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");

// ================= CONFIG =================
// Fill these in with your own info before using.
const DEVELOPER_NAME = "HR ID OY";      // <-- put your real name here
const BOT_TITLE = "TORU SYSTEM CORE"; // <-- dashboard title text
const ACCENT_A = "#00f2ff";              // primary neon color (cyan)
const ACCENT_B = "#a855f7";              // secondary neon color (violet)

module.exports = {
  config: {
    name: "up2",
    aliases: ["upt2"],
    version: "6.1",
    author: DEVELOPER_NAME,
    role: 0,
    countDown: 5,
    category: "System",
    shortDescription: "Up2 (System)",
    longDescription: "Quantum-grid styled real-time system dashboard with radial gauges",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event }) {
    const uptimeBot = process.uptime();
    const formatTime = sec => {
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      return `${d}d ${h}h ${m}m ${s}s`;
    };

    // ===== SYSTEM DATA =====
    const totalMem = os.totalmem() / 1024 / 1024 / 1024;
    const freeMem = os.freemem() / 1024 / 1024 / 1024;
    const usedMem = totalMem - freeMem;
    const ramPercent = (usedMem / totalMem) * 100;

    const cpuModel = os.cpus()[0].model.split("@")[0].trim();
    const cores = os.cpus().length;
    const cpuPercent = Math.min(((os.loadavg()[0] / cores) * 100), 100);
    const ping = Date.now() - event.timestamp;
    const pingPercent = Math.min((ping / 500) * 100, 100); // scale: 500ms = 100%
    const nodeVer = process.version;
    const hostname = os.hostname();

    // ===== SMART STATUS =====
    let status = "OPTIMAL";
    let statusColor = "#22c55e";
    if (ramPercent > 80 || ping > 300) {
      status = "CRITICAL";
      statusColor = "#ef4444";
    } else if (ramPercent > 60 || ping > 150) {
      status = "WARNING";
      statusColor = "#facc15";
    }

    // ===== CANVAS =====
    const width = 1000;
    const height = 620;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // --- Background base gradient ---
    const bg = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 750);
    bg.addColorStop(0, "#141024");
    bg.addColorStop(0.6, "#0d0b1a");
    bg.addColorStop(1, "#06050c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // --- Hexagon grid pattern overlay ---
    drawHexGrid(ctx, width, height, ACCENT_A);

    // --- Outer neon frame ---
    ctx.save();
    ctx.shadowColor = ACCENT_A;
    ctx.shadowBlur = 25;
    ctx.strokeStyle = ACCENT_A;
    ctx.lineWidth = 2;
    roundRect(ctx, 16, 16, width - 32, height - 32, 22);
    ctx.stroke();
    ctx.restore();

    // --- Glass card ---
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 40;
    const cardGrad = ctx.createLinearGradient(0, 40, 0, height - 40);
    cardGrad.addColorStop(0, "rgba(20,16,40,0.75)");
    cardGrad.addColorStop(1, "rgba(10,8,20,0.85)");
    ctx.fillStyle = cardGrad;
    roundRect(ctx, 40, 40, width - 80, height - 80, 20);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, 40, 40, width - 80, height - 80, 20);
    ctx.stroke();

    // ===== HEADER =====
    const titleGrad = ctx.createLinearGradient(70, 0, 500, 0);
    titleGrad.addColorStop(0, ACCENT_A);
    titleGrad.addColorStop(1, ACCENT_B);
    ctx.fillStyle = titleGrad;
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`⬡ ${BOT_TITLE}`, 70, 100);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px sans-serif";
    ctx.fillText("Real-Time Diagnostic & Performance Grid", 74, 124);

    // Status pill top-right
    ctx.font = "bold 13px sans-serif";
    const pillLabel = `● ${status}`;
    const pillW = ctx.measureText(pillLabel).width + 34;
    ctx.fillStyle = hexToRgba(statusColor, 0.15);
    roundRect(ctx, width - 70 - pillW, 68, pillW, 32, 16);
    ctx.fill();
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.2;
    roundRect(ctx, width - 70 - pillW, 68, pillW, 32, 16);
    ctx.stroke();
    ctx.fillStyle = statusColor;
    ctx.fillText(pillLabel, width - 70 - pillW + 17, 89);

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, 142);
    ctx.lineTo(width - 70, 142);
    ctx.stroke();

    // ===== TRIPLE RADIAL GAUGES =====
    const gaugeY = 250;
    const gaugeR = 68;
    const gaugeSpacing = (width - 140) / 3;
    const gauges = [
      { label: "CPU LOAD", value: cpuPercent, unit: "%", color: ACCENT_A },
      { label: "RAM USAGE", value: ramPercent, unit: "%", color: ACCENT_B },
      { label: "PING LOAD", value: pingPercent, unit: "%", color: statusColor, sub: `${ping} ms` }
    ];

    gauges.forEach((g, i) => {
      const gx = 70 + gaugeSpacing * i + gaugeSpacing / 2;

      // track
      ctx.beginPath();
      ctx.arc(gx, gaugeY, gaugeR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 12;
      ctx.stroke();

      // value arc
      ctx.save();
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(gx, gaugeY, gaugeR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (g.value / 100)));
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // center text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(g.sub || `${g.value.toFixed(1)}${g.unit}`, gx, gaugeY + 8);

      // label
      ctx.fillStyle = g.color;
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(g.label, gx, gaugeY + gaugeR + 32);
    });

    // RAM detail under gauges
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${usedMem.toFixed(2)} GB / ${totalMem.toFixed(2)} GB`, 70 + gaugeSpacing * 1 + gaugeSpacing / 2, gaugeY + gaugeR + 52);

    // ===== INFO STRIP =====
    const infoY = 420;
    const infoItems = [
      { label: "BOT UPTIME", value: formatTime(uptimeBot) },
      { label: "CPU MODEL", value: truncate(cpuModel, 24) },
      { label: "CORES", value: String(cores) },
      { label: "NODE VERSION", value: nodeVer },
      { label: "PLATFORM", value: `${os.platform()} (${os.arch()})` },
      { label: "HOSTNAME", value: truncate(hostname, 20) }
    ];

    const colCount = 3;
    const colW = (width - 140) / colCount;
    infoItems.forEach((item, i) => {
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const x = 70 + col * colW;
      const y = infoY + row * 70;

      ctx.fillStyle = "rgba(255,255,255,0.05)";
      roundRect(ctx, x, y, colW - 16, 56, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, colW - 16, 56, 10);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = ACCENT_A;
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(item.label, x + 14, y + 22);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(item.value, x + 14, y + 42);
    });

    // ===== FOOTER =====
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "12px sans-serif";
    ctx.fillText(`⚙ Quantum Monitoring Engine · Dev: ${DEVELOPER_NAME}`, 70, height - 55);

    ctx.textAlign = "right";
    ctx.fillText(`Generated: ${new Date().toLocaleString()}`, width - 70, height - 55);

    // ===== SAVE & SEND =====
    const tempPath = path.join(__dirname, `up2_${event.senderID || "cache"}.png`);
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(tempPath, buffer);

    await api.sendMessage(
      { attachment: fs.createReadStream(tempPath) },
      event.threadID,
      () => fs.unlinkSync(tempPath)
    );
  }
};

// ================= HELPERS =================
function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(str, max) {
  str = String(str);
  return str.length > max ? str.substring(0, max - 1) + "…" : str;
}

function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawHexGrid(ctx, width, height, color) {
  const hexSize = 34;
  const hexHeight = hexSize * Math.sqrt(3);
  ctx.save();
  ctx.strokeStyle = hexToRgba(color, 0.05);
  ctx.lineWidth = 1;
  for (let row = -1; row * hexHeight < height + hexHeight; row++) {
    for (let col = -1; col * hexSize * 1.5 < width + hexSize * 1.5; col++) {
      const x = col * hexSize * 1.5;
      const y = row * hexHeight + (col % 2 === 0 ? 0 : hexHeight / 2);
      drawHexagon(ctx, x, y, hexSize);
    }
  }
  ctx.restore();
}

function drawHexagon(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
	   }
	
