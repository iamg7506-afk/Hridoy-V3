const ALLOWED_UIDS = ["100067155687291", "61595715143202"];

module.exports = {
  config: {
		shortDescription: "Sh (Admin)", // auto-added: was missing, caused blank entry in help
    name: "sh",
    author: "HR ID OY",
    role: 2,
    category: "Admin",
    version: "1.0",
    guide: "{pn} <command>"
  },
  onStart: async function({ api, event, args }) {
    // === শুধুমাত্র নির্দিষ্ট UID এই কমান্ড ব্যবহার করতে পারবে ===
    if (!ALLOWED_UIDS.includes(String(event.senderID))) {
      return api.sendMessage("⛔ শুধুমাত্র নির্দিষ্ট এডমিন এই কমান্ডটি ব্যবহার করতে পারবে।", event.threadID, event.messageID);
    }

    const cmd = args.join(" ");
    if (!cmd) return api.sendMessage("Command daw", event.threadID, event.messageID);

    const { exec } = require("child_process");
    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
      const output = stdout || stderr || (err ? err.message : "No output");
      api.sendMessage(`Output:\n${output}`, event.threadID, event.messageID);
    });
  }
};
