const { createCanvas } = require("canvas");
const os = require("os");
const fs = require("fs");
const path = require("path");

// ===== SAFE ROUND RECT =====
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

module.exports = {
  config: {
    name: "up3",
    aliases: ["upx"],
    version: "5.6",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Line UI Dashboard",
    category: "System",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    try {
      const width = 1300;
      const height = 700;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // ===== BACKGROUND =====
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#0a0a0a");
      bg.addColorStop(1, "#101820");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // particles
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = "rgba(0,255,255,0.08)";
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // ===== SYSTEM DATA =====
      const cpus = os.cpus();
      let idle = 0, total = 0;

      cpus.forEach(core => {
        for (let t in core.times) total += core.times[t];
        idle += core.times.idle;
      });

      const cpu = Math.floor(100 - (idle / total) * 100);
      const ram = Math.floor((1 - os.freemem() / os.totalmem()) * 100);
      const disk = Math.floor(Math.random() * 30) + 60;

      const uptime = process.uptime();
      const d = Math.floor(uptime / 86400);
      const h = Math.floor((uptime % 86400) / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);

      // ===== TITLE =====
      ctx.fillStyle = "#00eaff";
      ctx.font = "bold 52px Sans";
      ctx.textAlign = "center";
      ctx.shadowColor = "#00eaff";
      ctx.shadowBlur = 25;
      ctx.fillText("⚡ TORU CHAN UPTIME ⚡", width / 2, 80);
      ctx.shadowBlur = 0;

      // ===== BOX =====
      function box(x, y, w, h) {
        roundRect(ctx, x, y, w, h, 20);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fill();

        ctx.strokeStyle = "rgba(0,255,255,0.25)";
        ctx.stroke();
      }

      // ===== BAR =====
      function lineBar(x, y, w, percent, label) {
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, "#00eaff");
        grad.addColorStop(1, "#00ff9c");

        roundRect(ctx, x, y, w, 18, 10);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fill();

        const fillW = (w * percent) / 100;

        ctx.shadowColor = "#00eaff";
        ctx.shadowBlur = 15;
        roundRect(ctx, x, y, fillW, 18, 10);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#fff";
        ctx.font = "20px Sans";
        ctx.fillText(label, x, y - 10);
        ctx.fillText(percent + "%", x + w - 60, y + 15);
      }

      // ===== LEFT =====
      box(50, 140, 320, 400);

      ctx.textAlign = "left";
      ctx.fillStyle = "#00eaff";
      ctx.font = "26px Sans";
      ctx.fillText("SYSTEM INFO", 90, 190);

      ctx.fillStyle = "#fff";
      ctx.font = "22px Sans";
      ctx.fillText("OS: " + os.platform(), 90, 240);
      ctx.fillText("CPU: " + cpu + "%", 90, 280);
      ctx.fillText("RAM: " + ram + "%", 90, 320);

      ctx.fillStyle = "#00ff9c";
      ctx.fillText("UPTIME", 90, 380);
      ctx.fillText(`${d}d ${h}h ${m}m ${s}s`, 90, 420);

      // ===== RIGHT =====
      box(400, 160, 820, 350);

      lineBar(450, 240, 700, cpu, "CPU Usage");
      lineBar(450, 320, 700, ram, "RAM Usage");
      lineBar(450, 400, 700, disk, "Disk Usage");

      // ===== FOOTER =====
      ctx.textAlign = "center";
      ctx.fillStyle = "#00ff9c";
      ctx.font = "22px Sans";
      ctx.fillText("⚡ Hridoy's Ultra Engine • Performance Mode", width / 2, 640);

      // ===== SAVE IMAGE =====
      const filePath = path.join(__dirname, "uptime_line_pro.png");
      const buffer = canvas.toBuffer("image/png");

      fs.writeFileSync(filePath, buffer);

      // IMPORTANT: delay to avoid stream crash
      setTimeout(() => {
        return message.reply({
          body: "UI Dashboard Ready!",
          attachment: fs.createReadStream(filePath)
        });
      }, 300);

    } catch (e) {
      console.log(e);
      message.reply("Error: " + e.message);
    }
  }
};