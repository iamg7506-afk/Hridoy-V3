const { createCanvas, loadImage } = require("canvas");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const axios = require("axios");
const si = require("systeminformation");

function formatBytes(bytes) {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function roundRect(ctx, x, y, w, h, r, fill = false, stroke = false) {
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
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawGraph(ctx, x, y, w, h, data, color) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  data.forEach((val, i) => {
    const px = x + (i * w) / (data.length - 1);
    const py = y + h - (val * h) / 100;
    ctx.lineTo(px, py);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, y, 0, y + h);
  gradient.addColorStop(0, `${color}40`);
  gradient.addColorStop(1, `${color}05`);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.fillStyle = gradient;
  ctx.fill();
}

module.exports = {
  config: {
    name: "uptime3",
    version: "6.6",
    author: "HR ID OY",
    role: 0,
    shortDescription: "Advanced Task Manager + Admin Stats",
    longDescription:
      "Displays a modern system monitor with CPU, RAM, Disk, Network, and admin info .",
    category: "System",
    guide: "{pn}"
  },

  onStart: async function ({ message, api, event, usersData, threadsData }) {
    try {
      // === System Data ===
      const uptimeSec = process.uptime();
      const h = Math.floor(uptimeSec / 3600);
      const m = Math.floor((uptimeSec % 3600) / 60);
      const s = Math.floor(uptimeSec % 60);
      const uptime = `${h}h ${m}m ${s}s`;

      const cpu = await si.currentLoad();
      const mem = await si.mem();
      const disk = await si.fsSize();
      const net = await si.networkStats();

      const cpuLoad = cpu.currentLoad.toFixed(1);
      const totalMem = mem.total;
      const usedMem = mem.active;
      const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
      const diskUsed = disk[0].used;
      const diskTotal = disk[0].size;
      const diskPercent = ((diskUsed / diskTotal) * 100).toFixed(1);
      const netDown = (net[0].rx_sec / 1024).toFixed(1);
      const netUp = (net[0].tx_sec / 1024).toFixed(1);

      const cpuModel = os.cpus()[0]?.model.split(" ").slice(0, 5).join(" ") || "CPU";

      const threads = await threadsData.getAll();
      const groups = threads.filter(t => t.threadInfo?.isGroup).length;
      const users = (await usersData.getAll()).length;

      // === Avatar Fetch ===
      const senderID = event.senderID;
      const botID = api.getCurrentUserID();

      const cachePath = path.join(__dirname, "cache");
      if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

      const avatarUser = path.join(cachePath, "user.png");
      const avatarBot = path.join(cachePath, "bot.png");

      const getAvatar = async (id, savePath) => {
        const url = `https://graph.facebook.com/${id}/picture?height=512&width=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const res = await axios.get(url, { responseType: "arraybuffer" });
        fs.writeFileSync(savePath, res.data);
      };

      await Promise.all([getAvatar(senderID, avatarUser), getAvatar(botID, avatarBot)]);

      // === Canvas ===
      const width = 940, height = 700;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Background Gradient
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, "#111827");
      bgGradient.addColorStop(1, "#1e293b");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Glass Panel
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      roundRect(ctx, 30, 30, width - 60, height - 60, 20, true);

      // Title - centered
      ctx.font = 'bold 28px "Segoe UI"';
      ctx.fillStyle = "#00d4ff";
      const title = "SYSTEM TASK MONITOR";
      const titleWidth = ctx.measureText(title).width;
      ctx.fillText(title, (width - titleWidth) / 2, 80);

      // CPU, Memory, Disk Bars
      const drawBar = (label, value, color, yPos) => {
        ctx.font = 'bold 18px "Segoe UI"';
        ctx.fillStyle = "#ccc";
        ctx.fillText(`${label}`, 60, yPos);
        ctx.fillStyle = "#555";
        roundRect(ctx, 220, yPos - 15, 500, 20, 10, true);
        ctx.fillStyle = color;
        roundRect(ctx, 220, yPos - 15, (value / 100) * 500, 20, 10, true);
        ctx.font = '16px "Segoe UI"';
        ctx.fillStyle = "#fff";
        ctx.fillText(`${value}%`, 740, yPos);
      };

      drawBar("CPU Usage", cpuLoad, "#00bcf2", 130);
      drawBar("Memory Usage", memPercent, "#ff9800", 170);
      drawBar("Disk Usage", diskPercent, "#e91e63", 210);

      // Network - larger and green
      ctx.font = 'bold 18px "Segoe UI"';
      ctx.fillStyle = "#4caf50";
      ctx.fillText(`Network ↓ ${netDown} KB/s ↑ ${netUp} KB/s`, 60, 260);

      // Uptime - larger and green
      ctx.fillText(`Uptime: ${uptime}`, 60, 300);

      // === Admin Info Box ===
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      roundRect(ctx, 60, 340, width - 120, 160, 15, true);

      ctx.fillStyle = "#00d4ff";
      ctx.font = 'bold 20px "Segoe UI"';
      ctx.fillText("ADMIN INFORMATION", 80, 370);

      // Make admin info text bigger
      ctx.fillStyle = "#ccc";
      ctx.font = 'bold 20px "Segoe UI"';
      ctx.fillText(`Name: HR ID OY`, 80, 405);
      ctx.fillText(`Age: 20+`, 80, 435);
      ctx.fillText(`Facebook:dukkhobilash827642`, 80, 465);
      ctx.fillText(`Home: Jashore`, 80, 495);

      // Admin profile pics
      const userAvatarImg = await loadImage(avatarUser);
      const botAvatarImg = await loadImage(avatarBot);

      ctx.save();
      ctx.beginPath();
      ctx.arc(width - 160, 415, 40, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(userAvatarImg, width - 200, 375, 80, 80);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(width - 260, 415, 35, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(botAvatarImg, width - 295, 380, 70, 70);
      ctx.restore();

      // Graphs
      const cpuHistory = Array.from({ length: 40 }, () => Math.random() * 100);
      drawGraph(ctx, 80, 500, 780, 100, cpuHistory, "#00d4ff");

      // === Save Image ===
      const output = path.join(cachePath, "advanced_uptime.png");
      fs.writeFileSync(output, canvas.toBuffer("image/png"));

      await message.reply({
        body: "",
        attachment: fs.createReadStream(output)
      });

      // Cleanup
      setTimeout(() => {
        [output, avatarUser, avatarBot].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
      }, 5000);
    } catch (err) {
      console.error("Uptime error:", err);
      message.reply("⚠️ Failed to generate system status image.");
    }
  }
};