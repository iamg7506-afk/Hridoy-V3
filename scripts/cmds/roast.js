module.exports = {
config: {
name: "roast",
aliases: ["ro"],
version: "5.1",
author: "HR ID OY",
countDown: 5,
role: 1,
shortDescription: {
en: "Roast a replied or mentioned user"
},
longDescription: {
en: "Send a random roast line to a replied or mentioned user."
},
category: "Tag Fun",
guide: {
en: "{pn} @mention\n{pn} (reply to someone's message)"
}
},

onStart: async function ({ message, api, event }) {
let targetID, targetName;

// Reply system
if (event.messageReply) {
  targetID = event.messageReply.senderID;
  targetName = event.messageReply.senderName || "User";
}

// Mention system
else if (Object.keys(event.mentions).length > 0) {
  targetID = Object.keys(event.mentions)[0];
  targetName = event.mentions[targetID];
}
else {
  return message.reply("❌ | Please reply to someone's message or mention a user.");
}

const tagText = `@${targetName}`;

const roasts = [
  "তোর future দেখে Google Maps-ও বলে: Route not found! এতদূর গেলেও কোনো ভালো পথ পাওয়া যায় না তোর জীবনে 🗺️",
  "তুই এত slow, Internet Explorer তোকে দেখে inspiration নেয়। তুই কথা বলার আগেই সবাই ঘুমিয়ে পড়ে 🐌",
  "তোর IQ hide and seek খেলতেছে, এখনও খুঁজে পাওয়া যায় নাই। হয়তো চিরকালই লুকিয়ে থাকবে 🔍",
  "তুই online থাকিস, কিন্তু তোর system সবসময় offline। মেসেজ করলেও রিপ্লাই আসে না 📡",
  "তোর crush তোকে দেখে airplane mode on করে। কাছে গেলেই ফোন সাইলেন্ট হয়ে যায় ✈️",
  "তোর brain update নিতে গিয়ে server timeout হয়ে গেছে। এখনো loading চলছে, ১% এ আটকে আছে ⏳",
  "তোর কথা শুনে Siri-ও বলে: Sorry, I didn't understand। তুই এমন কনফিউজিং যে AI-ও হার মানে 😵",
  "তুই এত unlucky, coin toss-এ coin-ই হারিয়ে যায়। ভাগ্য তো তোকে দেখে পালায় 🪙",
  "তোর logic দেখে calculator-ও চাকরি ছাড়তে চায়। তুই গুনলে উত্তর উল্টোপাল্টা হয়ে যায় 🧮",
  "তোর plan সবসময় perfect... fail হওয়ার জন্য। তুই প্ল্যান করিস আর সবাই হাসে 😆",
  "তুই WiFi password-এর মতো, কেউ মনে রাখতে চায় না। সবাই ভুলে যায় তোকে 📶",
  "তুই group project-এর সেই member, নাম আছে কিন্তু কাজ নাই। শেষে সবাই তোকে blame করে 🗿",
  "তোর confidence NASA-র rocket, কিন্তু result local bus এর মতো। উড়তে গিয়ে মাটিতে নামে 🚍",
  "তোর talent এত hidden, FBI-ও খুঁজে পায় না। হয়তো কখনো বের হবে না 🕵️",
  "তুই joke মারলে audience warranty claim করতে চায়। তোর জোকস এত পুরনো যে সবাই বিরক্ত হয় 🎤",
  "তোর fashion sense দেখে mannequin-ও ভয় পায়। তুই পরলে জিনিসগুলো নিজেই লজ্জা পায় 👕",
  "তুই এমন player, tutorial-এও game over খাস। গেম শুরু করার আগেই হেরে যাস 🎮",
  "তোর face unlock দেখে phone ভাবে: Try again later। তোর মুখ দেখে ফোন চিনতে চায় না 📱",
  "তোর idea শুনে light bulb-ও জ্বলে না। বরং বন্ধ হয়ে যায় 💡",
  "তুই Google search-এর 2nd page-এর মতো, কেউ যায় না সেখানে। সবাই প্রথম পেজেই থেমে যায় 🌚",
  "তোর brain loading... 1% complete... please wait। এখনো অনেক সময় লাগবে ⏳",
  "তোর luck এমন, free trial নিলেও payment কেটে যায়। ভাগ্য তোকে কখনো সাপোর্ট করে না 💳",
  "তুই alarm clock-এর মতো, সবাই বন্ধ করতে চায়। তোর কথা শুনলেই ঘুম পায় ⏰",
  "তোর confidence unlimited, কিন্তু skill trial version। দেখতে ভালো, কাজের কিছু না 😭",
  "তোর কথা শুনে echo-ও reply দিতে অস্বীকার করে। তোর কথা ফিরতেও চায় না 🗣️",
  "তোর presence দেখে ghost-ও disappear হয়ে যায়। তুই এত বিরক্তিকর 👻",
  "তোর memory RAM 128MB, দুই মিনিট আগের কথাও ভুলে যাস। সবকিছু মাথায় থাকে না 🤣",
  "তোকে দেখে মনে হয় calculator-এও তুই ভুল দিস। সবকিছুতে ভুল করিস 😜",
  "তুই এমন একটা অবস্থা, mirror তোকে ignore করে। নিজেকেও দেখতে চায় না 😆",
  "তোর IQ এত low, mosquito repellent-ও ignore করে। মশাও তোকে এড়িয়ে চলে 😅",
  "তুই মানুষ না meme, তোকে নিয়ে সবাই হাসে। তুই জীবন্ত মিম হয়ে গেছিস 🤣",
  "তুই এত useless, Google-এ খুঁজলেও কাজের কিছু পাবি না। সার্চ করেও কোনো ফলাফল নেই 🧐",
  "তোর crush তোকে দেখে বলে, 'ভাই এই দিক দিয়া না'। কাছে যেতে চায় না 😬",
  "তুই একমাত্র friend, যারে tag দিলে পস্তাই। সবাই তোকে tag করতে ভয় পায় 😒",
  "তুই math এ এত বাজে, 2+2=22 বিশ্বাস করিস। গুনতে গিয়েও ভুল হয় 📚",
  "তুই joke করিস, হাসি আসে না — বরং ঘুম আসে। তোর জোকস ঘুমের ওষুধ 💤",
  "তোর attitude এত fake, barcode দিয়ে scan করা যায়। সবকিছু নকল 🏷️",
  "তুই dustbin-ও accept করে না, even trash has standards। তুই তার থেকেও নিচে 🗑️",
  "তুই এমন dull, candle ও জ্বলে না পাশে। তোর সাথে থাকলে মুড অফ হয়ে যায় 🕯️",
  "তুই face unlock দিস, phone ঘুমিয়ে পড়ে। তোর মুখ দেখে ফোন টায়ার্ড হয় 😴",
  "তুই এত চিপ, discount-er নিচেও চলে যাস। সবাই তোকে কম দামে পায় 💸",
  "তুই হ্যান্ডসাম? হাহা, Google confirm করে নাই। এখনো সার্চ চলছে 😆",
  "তুই এত বেকার যে তোর shadow-ও তোকে ছেড়ে পালায়। নিজের ছায়াও সাথে থাকতে চায় না 🏃‍♂️",
  "তোর personality দেখে Netflix বলে 'No match found'। কোনো ম্যাচিং হয় না 📺",
  "তুই এত slow যে স্লথ তোকে দেখে বলে 'ভাই তুই তো আমার গুরু'। সবাই তোকে দেখে শিখে 🦥",
  "তোর জীবন এত boring যে কমেডি মুভি দেখেও ঘুম পায়। তুই থাকলে মজা উড়ে যায় 😴",
  "তুই এমন ভাগ্যহীন যে lottery-তে টিকিট কিনলেও ভুল নাম্বার হয়। ভাগ্য তো তোর সাথে নেই",
  "তোর কথা শুনে পাখি ও উড়ে পালায়। তোর গলা শুনলে সবাই দূরে চলে যায় 🐦",
  "তুই এত অপদার্থ যে তোর বন্ধুরাও তোকে 'backup friend' রাখে। মেইন ফ্রেন্ড কখনো না",
  "তোর style দেখে ২০০০ সালের ফ্যাশন ম্যাগাজিন লজ্জা পায়। তোর ফ্যাশন পুরনো যুগের",
  "তোর brain এত খালি যে echo-ও ভয় পেয়ে চলে যায়। ভিতরে কিছুই নেই",
  "তুই exam দিলে examiner-ও বলে 'ভাই এটা কী লিখছিস?'। তোর উত্তর দেখে সবাই অবাক হয় 📝",
  "তোর dance দেখলে পাথরও হাসতে হাসতে ফেটে যায়। তোর নাচ দেখে সবাই মজা পায় 💃",
  "তুই এত confuse যে আয়নায় নিজেকে দেখেও বলিস 'কে তুই?'। নিজেকেও চিনিস না",
  "তোর singing শুনে microphone নিজেই বন্ধ হয়ে যায়। তোর গান শুনলে কান বন্ধ করতে ইচ্ছে করে 🎤",
  "তুই এমন রান্না করিস যে খাবার নিজেই পালিয়ে যায়। তোর হাতে পড়লে খাবারও ভয় পায় 🍳",
  "তোর jokes এত পুরনো যে দাদু-ও বলে 'আবার এটা?'। নতুন কিছু শেখ",
  "তুই এত নোংরামি করিস যে তোর কাছে থাকলে মনে হয় কোনো ফ্লার্টি মুভির ভিলেনের সাথে আছি, কিন্তু শেষে হাসতে হাসতে পালাতে ইচ্ছে করে 😉",
  "তোর চোখ দেখে মনে হয় flirt করতে এসেছিস, কিন্তু কথা বললে বুঝি তুই নিজেই লজ্জায় পড়ে যাবি 😏"
];

const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

return api.sendMessage({
  body: `${tagText}, ${randomRoast}`,
  mentions: [{ id: targetID, tag: tagText }]
}, event.threadID, event.messageID);
}
};
