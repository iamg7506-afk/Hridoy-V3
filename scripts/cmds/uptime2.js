const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const os = require("os");

const processStartTime = Date.now();

// ===== CPU USAGE =====
function getCpuUsage() {
  const start = process.cpuUsage();
  const startTime = process.hrtime();

  return new Promise(resolve => {
    setTimeout(() => {
      const elap = process.hrtime(startTime);
      const end = process.cpuUsage(start);

      const elapsedMicros = elap[0] * 1e6 + elap[1] / 1e3;
      const cpuPercent = ((end.user + end.system) / elapsedMicros) * 100;

      resolve(cpuPercent.toFixed(2));
    }, 300);
  });
}

// ===== DOWNLOAD =====
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error("Download failed"));
      res.pipe(file);

      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      try { fs.unlinkSync(dest); } catch {}
      reject(err);
    });
  });
}

module.exports = {
  config: {
    name: "uptime2",
    aliases: ["botstats2"],
    version: "3.1",
    role: 0,
    author: "HR ID OY",
    category: "System",
    description: "Advanced full system stats dashboard",
    guide: "{pn}uptime2"
  },

  onStart: async function ({ message, api, usersData, threadsData }) {
    try {

      const cpuUsage = await getCpuUsage();

      const allUsers = await usersData.getAll();
      const allThreads = await threadsData.getAll();

      const uptime = process.uptime();

      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      const uptimeString = `${days}D ${hours}H ${minutes}M ${seconds}S`;

      const cpuModel = os.cpus()[0].model;
      const cores = os.cpus().length;

      const totalMem = os.totalmem() / 1024 / 1024;
      const freeMem = os.freemem() / 1024 / 1024;
      const usedMem = totalMem - freeMem;

      const memPercent = ((usedMem / totalMem) * 100).toFixed(2);

      const platform = os.platform();
      const arch = os.arch();
      const loadAvg = os.loadavg()[0].toFixed(2);

      const nodeVersion = process.version;
      const pid = process.pid;

      const msg =
`╭─🌟 𝐁𝐎𝐓 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃
│
├⏱️ Uptime: ${uptimeString}
├📅 Start Time: ${new Date(processStartTime).toLocaleString()}
│
├👥 Users: ${allUsers.length.toLocaleString()}
├💬 Groups: ${allThreads.length.toLocaleString()}
│
├💻 CPU Model: ${cpuModel}
├⚙️ CPU Cores: ${cores}
├📊 CPU Usage: ${cpuUsage}%
├📈 Load Average: ${loadAvg}
│
├🖥️ RAM Total: ${totalMem.toFixed(0)} MB
├🟢 RAM Free: ${freeMem.toFixed(0)} MB
├🔴 RAM Used: ${usedMem.toFixed(0)} MB (${memPercent}%)
│
├🌐 Platform: ${platform} (${arch})
├🟣 Node Version: ${nodeVersion}
├🆔 Process ID: ${pid}
│
├🔥 Status: ${cpuUsage < 40 ? "Stable 🟢" : cpuUsage < 75 ? "Moderate 🟡" : "High Load 🔴"}
╰───────────────◉`;

      // ===== MEDIA =====
      const media = [
   "https://i.imgur.com/KWbXV92.jpeg",
  "https://i.imgur.com/5FY4ZBC.jpeg",
  "https://i.imgur.com/1upcLBv.jpeg",
  "https://i.imgur.com/pHbsaM5.jpeg",
  "https://i.imgur.com/YSUo4ex.jpeg",
  "https://i.imgur.com/Damd4Za.jpeg",
  "https://i.imgur.com/OiLJUxL.jpeg",
  "https://i.imgur.com/6T760Fu.jpeg",
  "https://i.imgur.com/P8gi4k8.jpeg"
      ];

      const url = media[Math.floor(Math.random() * media.length)];

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const filePath = path.join(cacheDir, path.basename(url));

      if (!fs.existsSync(filePath)) {
        await downloadFile(url, filePath);
      }

      return message.reply({
        body: msg,
        attachment: fs.createReadStream(filePath)
      });

    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to load detailed uptime dashboard.");
    }
  }
};