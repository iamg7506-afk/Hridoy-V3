module.exports = {
  config: {
    name: "delete",
    aliases: ["del"],
    shortDescription: "Delete a command file",
    guide: "{pn} <filename>",
    author: "HR ID OY",
    role: 2,
    category: "System",
    version: "1.0"
  },

  onStart: async function ({ api, event, args }) {
    const fs = require('fs');
    const path = require('path');

    if (!args[0]) {
      return api.sendMessage("❌ Please provide a file name.\nExample: .delete hop", event.threadID);
    }

    // Auto add .js if not present
    let fileName = args[0];
    if (!fileName.endsWith('.js')) fileName += '.js';

    const filePath = path.join(__dirname, fileName);

    fs.unlink(filePath, (err) => {
      if (err) {
        return api.sendMessage(`❎ Failed to delete ${fileName}.\nFile not found!`, event.threadID);
      }
      api.sendMessage(`✅ ( ${fileName} ) Deleted successfully!`, event.threadID);
    });
  }
};
