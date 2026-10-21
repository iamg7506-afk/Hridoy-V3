const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.vercel.app";

const pathData = path.join(__dirname, "assets/hubble/nasa.json");
let hubbleData;

module.exports = {
  config: { name: "hubble", version: "2.1", author: "HR ID OY", countDown: 5, role: 0, description: { en: "View Hubble images" }, category: "Utility", guide: { en: "{pn} <date (mm-dd)>" } },
  onLoad: async function () {
    await fs.ensureDir(path.dirname(pathData));
    if (!fs.existsSync(pathData)) {
      const config = (await axios.get(`${API_BASE}/api/links/hubble`)).data;
      const res = await axios.get(config.dataUrl);
      fs.writeFileSync(pathData, JSON.stringify(res.data, null, 2));
    }
    hubbleData = JSON.parse(fs.readFileSync(pathData));
  },
  onStart: async function ({ message, args }) {
    const date = args[0] || "";
    const dateText = checkValidDate(date);
    if (!date || !dateText) return message.reply("The date you entered is invalid, please enter again in the mm-dd format");
    const config = (await axios.get(`${API_BASE}/api/links/hubble`)).data;
    const data = hubbleData.find(e => e.date.startsWith(dateText));
    if (!data) return message.reply("No images were found on this day");
    const { image, name, caption, url } = data;
    const getImage = await global.utils.getStreamFromURL(`${config.url}${image}`);
    message.reply({ body: `📅 Date: ${dateText}\n🌀 Name: ${name}\n📖 Caption: ${caption}\n🔗 Source: ${url}`, attachment: getImage });
  }
};

const monthText = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function checkValidDate(date) {
  const dateArr = date.split(/[-/]/);
  if (dateArr.length != 2) return false;
  let day, month;
  if (dateArr[0] < 13) { day = dateArr[1]; month = dateArr[0]; } else { day = dateArr[0]; month = dateArr[1]; }
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (month === 2 && day > 29) return false;
  if ([4,6,9,11].includes(+month) && day > 30) return false;
  return monthText[month-1] + ' ' + parseInt(day);
}
