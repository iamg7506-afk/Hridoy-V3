module.exports = {
  config: {
    name: "ugly",
    version: "2.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Calculate ugliness level",
    longDescription: "Checks how ugly a person is with profile picture.",
    category: "Tag Fun",
    guide: "{pn} / {pn} @tag / reply to user"
  },

  onStart: async function ({ api, event, usersData }) {
    try {
      // ১. টার্গেট ডিটেকশন (Target Detection)
      let targetID;
      let targetName;

      if (event.type === "message_reply") {
        // যদি রিপ্লাই করা হয়
        targetID = event.messageReply.senderID;
        targetName = await usersData.getName(targetID);
      } else if (Object.keys(event.mentions).length > 0) {
        // যদি মেনশন বা ট্যাগ করা হয়
        targetID = Object.keys(event.mentions)[0];
        targetName = event.mentions[targetID].replace(/@/g, "");
      } else {
        // যদি কিছুই না করা হয় (নিজের চেক)
        targetID = event.senderID;
        targetName = await usersData.getName(targetID);
      }

      // ২. র‍্যান্ডম পার্সেন্টেজ জেনারেট (1% থেকে 100%)
      const uglyPercentage = Math.floor(Math.random() * 101);

      // ৩. মজার কমেন্ট যুক্ত করা (Optional Fun Comments)
      let comment = "";
      if (uglyPercentage < 20) comment = "Wow, you look like an Angel! 😳❤️";
      else if (uglyPercentage < 50) comment = "Not bad, you look decent. 👍";
      else if (uglyPercentage < 80) comment = "Damn! Put a mask on. 😷";
      else comment = "MY EYES! The mirror is broken! 🤮💔";

      // ৪. প্রোফাইল পিকচার লিঙ্ক জেনারেট
      const avatarURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      // ৫. মেসেজ পাঠানো (Image + Text)
      return api.sendMessage({
        body: `👤 User: ${targetName}\n💩 Ugliness Level: ${uglyPercentage}%\n\n${comment}`,
        attachment: await global.utils.getStreamFromURL(avatarURL)
      }, event.threadID, event.messageID);

    } catch (error) {
      console.error(error);
      return api.sendMessage("An error occurred while calculating ugliness!", event.threadID, event.messageID);
    }
  }
};