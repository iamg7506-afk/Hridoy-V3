const { getTime } = global.utils;

module.exports = {
  config: {
    name: "antileave",
    version: "3.0",
    author: "Hridoy",
    category: "events"
  },

  onStart: async ({ api, event, usersData, message }) => {
    if (event.logMessageType !== "log:unsubscribe") return;

    const { threadID, logMessageData, author } = event;
    const leftID = logMessageData.leftParticipantFbId;

    // Only re-add if the user left by themselves
    if (leftID !== author) return;

    try {
      const userName = await usersData.getName(leftID);

      const boldMap = {
        A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
        K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
        U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
        a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷",
        k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁",
        u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇"
      };

      const boldName = userName
        .split("")
        .map(char => boldMap[char] || char)
        .join("");

      await api.addUserToGroup(leftID, threadID);

      await message.send({
        body: `
        
╭━━━〔 🚫 𝗔𝗡𝗧𝗜 • 𝗟𝗘𝗔𝗩𝗘 〕━━━╮

😹 𝗢𝗼𝗽𝘀! ${boldName}

🏃‍♂️ 𝗬𝗼𝘂 𝘁𝗿𝗶𝗲𝗱 𝘁𝗼 𝗹𝗲𝗮𝘃𝗲 𝘁𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽.
🚫 𝗕𝘂𝘁 𝘁𝗵𝗮𝘁 𝗶𝘀𝗻'𝘁 𝗮𝗹𝗹𝗼𝘄𝗲𝗱!

🔄 𝗬𝗼𝘂 𝗵𝗮𝘃𝗲 𝗯𝗲𝗲𝗻 𝗮𝗱𝗱𝗲𝗱 𝗯𝗮𝗰𝗸.
💖 𝗢𝗻𝗰𝗲 𝘆𝗼𝘂 𝗷𝗼𝗶𝗻, 𝘆𝗼𝘂'𝗿𝗲 𝗮 𝗽𝗮𝗿𝘁 𝗼𝗳 𝘁𝗵𝗶𝘀 𝗳𝗮𝗺𝗶𝗹𝘆.

⏰ 𝗧𝗶𝗺𝗲: ${getTime("HH:mm:ss")}
✨ 𝗛𝗮𝘃𝗲 𝗮 𝗻𝗶𝗰𝗲 𝗱𝗮𝘆!

╰━━━━━━━━━━━━━━━━━━━━╯`
      });

    } catch (err) {
      console.error("AntiLeave Error:", err);
    }
  }
};