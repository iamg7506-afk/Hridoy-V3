const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.vercel.app";
const CMD_NAME = "dummy";

module.exports = {
  config: {
    name: "dummy", version: "2.2", author: "HR ID OY", countDown: 5, role: 0,
    shortDescription: "Generate dummy text image", category: "Image",
    guide: "{pn} <text> [color]\nExample: +dummy Hello world red"
  },
  onStart: async function ({ message, args }) {
    if (!args.length) return message.reply("⚠️ Please provide text. Example: +dummy Hello world red");
    const colorNames = ["black","white","red","green","blue","yellow","gray","orange","purple","pink","cyan"];
    let bgColor = "000000";
    let textArgs = args;
    const lastArg = args[args.length - 1].toLowerCase();
    const hexMatch = lastArg.match(/^#?([0-9a-f]{6})$/i);
    if (hexMatch) { bgColor = hexMatch[1]; textArgs = args.slice(0, -1); }
    else if (colorNames.includes(lastArg)) { bgColor = lastArg; textArgs = args.slice(0, -1); }
    if (!textArgs.length) return message.reply("⚠️ Please provide text before color.");
    const config = (await axios.get(`${API_BASE}/api/links/${CMD_NAME}`)).data;
    const text = encodeURIComponent(textArgs.join(" "));
    const imageUrl = `${config.url}/${bgColor}/fff&text=${text}`;
    const filePath = path.join(__dirname, "cache", `dummy_${Date.now()}.png`);
    await fs.ensureDir(path.dirname(filePath));
    const res = await axios({ url: imageUrl, method: "GET", responseType: "arraybuffer" });
    fs.writeFileSync(filePath, Buffer.from(res.data));
    message.reply({ body: `🖼️ Dummy image (bg: ${bgColor}):\n*${textArgs.join(" ")}*`, attachment: fs.createReadStream(filePath) },
      () => fs.unlinkSync(filePath));
  }
};
