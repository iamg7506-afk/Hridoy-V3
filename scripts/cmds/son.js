const fs = require("fs");
const path = __dirname + "/cache/son.json";

if (!fs.existsSync(path)) {
  fs.writeFileSync(path, JSON.stringify({}));
}

module.exports.config = {
  name: "son",
  version: "3.1",
  author: "HR ID OY",
  category: "Tag Fun",
  shortDescription: "Son (Tag Fun)", // auto-added: was missing, caused blank entry in help
  guide: "{pn}", // auto-added: was missing, caused blank usage in help
  role: 0
};

// ===================== ON START =====================
module.exports.onStart = async function ({ api, event, args }) {

  const admins = global.GoatBot.config.adminBot || [];

  if (!admins.includes(event.senderID)) {
    return api.sendMessage(
      "❌ Only my boss farhan can use this command!",
      event.threadID,
      event.messageID
    );
  }

  let data = JSON.parse(fs.readFileSync(path));

  // OFF SYSTEM
  if (args[0] === "off") {
    delete data[event.threadID];
    fs.writeFileSync(path, JSON.stringify(data, null, 2));

    return api.sendMessage(
      "✅ ওকে বস ওর চুদা বন্ধ করা হয়েছে!",
      event.threadID,
      event.messageID
    );
  }

  // ON SYSTEM
  if (args[0] === "on") {
    const mention = Object.keys(event.mentions)[0];
    if (!mention) {
      return api.sendMessage(
        "❌ বস একজনকে মেনশন করুন!",
        event.threadID,
        event.messageID
      );
    }

    let name = event.mentions[mention];

    try {
      const info = await api.getUserInfo(mention);
      name = info[mention]?.name || name;
    } catch (e) {}

    data[event.threadID] = {
      uid: mention,
      name: name,
      index: 0
    };

    fs.writeFileSync(path, JSON.stringify(data, null, 2));

    const msg = `✅ ওকে বস 𓆩»${name}«𓆪\nএই খানকির পোলা SMS করলেই চুদা ফ্রী 🔥`;

    return api.sendMessage(
      {
        body: msg,
        mentions: [
          {
            tag: name,
            id: mention,
            fromIndex: msg.indexOf(name)
          }
        ]
      },
      event.threadID,
      event.messageID
    );
  }

  return api.sendMessage(
    "Usage:\nson on @user\nson off",
    event.threadID,
    event.messageID
  );
};

// ===================== ON CHAT =====================
module.exports.onChat = async function ({ api, event }) {

  if (!event.body) return;

  let data = JSON.parse(fs.readFileSync(path));

  if (!data[event.threadID]) return;

  const target = data[event.threadID];

  if (event.senderID !== target.uid) return;

  const text = event.body.toLowerCase().trim();
  if (text.startsWith("son ")) return;

  const messages = [
    "\nখাংকির পোলা, তোর মার ভোদা তে গাধার মাল ফালাবো! 😈",
    "\nতোর মাকে চুদে পল্টি মারবো! 😡",
    "\nতোর মার গুদে ফুল ট্যাবলেট পুশ করবো! 🤡",
    "\nতোর মার ভোদায় গাধার মাল ফালিয়ে দিবো! 🔥",
    "\nতোর মাকে গাধার মতো চুদে বলবো এটা কার মাল? 😂",
    "\nএই খানকির পোলা বেশ্যার পোলা তোর মাকে চুদে আমার বস সারা বেলা! 🖕💯",
    "\nতোর মার গুদে ইনপুট দিয়ে আউটপুট নেবো! 💀",
    "\nআম পাতা জোড়া জোড়া তোর মাকে চুদবো উরাধুরা! 🖕",
    "\nতোর মার ভোদা ফাটিয়ে দিবো রাত ভর! 🍆💦",
    "\nখানকি মাগির পোলা, তোর মাকে ডগি স্টাইলে চুদবো! 🐕",
    "\nতোর মার গুদে আমার বাঁশ ঢুকাবো! 🌿😈",
    "\nবেশ্যার ছেলে, তোর মাকে পাবলিকে চুদবো! 🖕",
    "\nতোর মার ভোদায় কুকুরের মাল ঢেলে দিবো! 🐶",
    "\nএই হারামজাদা, তোর মাকে চুদে গর্ভবতী করে দিবো! 🤰",
    "\nতোর মার গুদ ফাটিয়ে রক্ত বের করে দিবো! 🩸",
    "\nখানকির পোলা তোর মাকে চুদে মুখে মাল ফেলবো! 😏",
    "\nতোর মাকে রিকশাওয়ালার মতো চুদবো সারাদিন! 🚲"
  ];

  let index = target.index || 0;

  const msgText = `${target.name} ${messages[index % messages.length]}`;

  setTimeout(() => {
    api.sendMessage(
      {
        body: msgText,
        mentions: [
          {
            tag: target.name,
            id: target.uid,
            fromIndex: msgText.indexOf(target.name)
          }
        ]
      },
      event.threadID,
      event.messageID
    );
  }, 2000);

  data[event.threadID].index = index + 1;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};
