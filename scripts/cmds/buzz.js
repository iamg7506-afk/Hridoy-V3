const delay = (ms) => new Promise(res => setTimeout(res, ms));

module.exports = {
  config: {
    name: "buzz",
    version: "3.2.1",
    role: 2,
    author: "HR ID OY",
    description: "১০০+ KAKASHI স্টাইল ক্যাপশন পাঠায়",
    category: "Admin",
    usages: "@mention",
    cooldowns: 5,
  },

  onStart: async function({ message, event, args, api }) {
    try {
      const mention = Object.keys(event.mentions)[0];
      if (!mention) {
        return message.reply("😅 যার জন্য মেসেজ যাবে তাকে আগে @ম্যানশন করো ভাই!");
      }

      const name = event.mentions[mention];
      const arraytag = [{ id: mention, tag: name }];

      const messages = [
        `KAKASHI তোমাকে ভালোবাসে ${name} ❤️`,
        `KAKASHI সবসময় তোমার পাশে আছে ${name} 🫶`,
        `KAKASHI তোমাকে খুব মিস করে ${name} 😘`,
        `KAKASHI তোমাকে নিয়ে ভাবে ${name} 🌸`,
        `KAKASHI চায় তুমি সবসময় হাসো ${name} 😊`,
        `KAKASHI এর কাছে তুমি অনেক স্পেশাল ${name} 💝`,
        `KAKASHI তোমার জন্য সব করতে রাজি ${name} 💌`,
        `KAKASHI তোমার কথা সবসময় ভাবে ${name} 🥰`,
        `KAKASHI শুধু তোমাকেই চায় ${name} 💖`,
        `KAKASHI তোমাকে ছাড়া কিছু ভাবতে পারে না ${name} 😍`,
        `KAKASHI তোমাকে সারাজীবন ভালোবাসবে ${name} 💛`,
        `KAKASHI তোমার জন্য অপেক্ষা করছে ${name} 🌹`,
        `KAKASHI মনে করে তুমি আজও সুন্দর ${name} 🌸`,
        `KAKASHI তোমার হাসি দেখতে পেতে চায় ${name} 😄`,
        `KAKASHI তোমাকে কাছে পেতে চায় ${name} 🫶`,
        `KAKASHI সবসময় তোমার খোঁজ রাখে ${name} ❤️`,
        `KAKASHI তোমাকে নিয়ে স্বপ্ন দেখে ${name} 🌙`,
        `KAKASHI তোমার ভালোবাসা চায় ${name} 💖`,
        `KAKASHI তোমাকে আজও মনে করছে ${name} 💌`,
        `KAKASHI সবসময় তোমার কথা ভাবছে ${name} 🥰`,
        `KAKASHI তোমাকে সারাক্ষণ মনে রাখে ${name} 💛`,
        `KAKASHI তোমার সঙ্গে সময় কাটাতে চায় ${name} 🌹`,
        `KAKASHI তোমাকে প্রিয় মনে করে ${name} 💝`,
        `KAKASHI শুধু তোমার জন্য আছে ${name} 🫶`,
        `KAKASHI তোমার সাথে হাসতে চায় ${name} 😄`,
        `KAKASHI তোমার খুশি চায় ${name} ❤️`,
        `KAKASHI তোমাকে সবসময় মিস করছে ${name} 💌`,
        `KAKASHI তোমার জন্য দোয়া করছে ${name} 🌸`,
        `KAKASHI তোমাকে প্রণয় করে দেখতে চায় ${name} 💖`,
        `KAKASHI তোমার কাছে সবসময় ফিরবে ${name} 💛`,
        `KAKASHI তোমাকে ভাবতেই ভালো লাগে ${name} 🥰`,
        `KAKASHI তোমার সঙ্গে স্বপ্ন ভাগ করতে চায় ${name} 🌙`,
        `KAKASHI তোমাকে কখনো ভুলবে না ${name} 💝`,
        `KAKASHI তোমার হাসি তার শক্তি ${name} 😄`,
        `KAKASHI তোমার জন্য সব সময় অপেক্ষা করবে ${name} 🌹`,
        `KAKASHI তোমাকে সান্ত্বনা দিতে চায় ${name} 🫶`,
        `KAKASHI তোমার ভালোবাসা চিরকাল চাইবে ${name} ❤️`,
        `KAKASHI তোমার কথা মনে পড়ে বারবার ${name} 💌`,
        `KAKASHI তোমাকে কাছে পেতে চায় সর্বদা ${name} 💖`,
        `KAKASHI তোমার জন্য তার হৃদয় খুলে রেখেছে ${name} 💛`,
        `KAKASHI তোমাকে চিরকাল মনে রাখবে ${name} 🥰`,
        `KAKASHI তোমার ভালোবাসা প্রাপ্য ${name} 🌸`,
        `KAKASHI সব সময় তোমার পাশে থাকবে ${name} 🌙`,
        `KAKASHI তোমাকে নিয়ে প্রতিদিন চিন্তা করে ${name} 💝`,
        `KAKASHI তোমাকে ভালোবাসার শব্দ জানে না ${name} 💌`,
        `KAKASHI তোমাকে সব সময় হাসাতে চায় ${name} 😄`,
        `KAKASHI তোমার জন্য প্রার্থনা করে ${name} 🌹`,
        `KAKASHI তোমার সঙ্গে প্রতিটি মুহূর্ত উপভোগ করতে চায় ${name} 🫶`,
        `KAKASHI তোমাকে সবসময় মনে রাখবে ${name} ❤️`,
        `KAKASHI তোমার ভালোবাসায় পূর্ণ ${name} 💖`
      ];

      message.reply(`😎 শুরু হচ্ছে "KAKASHI স্টাইল স্টকিং" ${name}-এর জন্য...`);

      for (const msg of messages) {
        await delay(3000);
        message.reply({ body: msg, mentions: arraytag });
      }

      message.reply(`💘 শেষ! KAKASHI ${name}-এর প্রতি ভালোবাসার ডেলিভারি সম্পন্ন 😅`);
    } catch (err) {
      console.error(err);
      message.reply("❌ কিছু একটা সমস্যা হয়েছে ভাই, আবার চেষ্টা করো।");
    }
  }
};
