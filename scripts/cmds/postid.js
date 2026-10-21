module.exports = {
  config: {
    name: "postid",
    aliases: ["getpostid", "fbid"],
    version: "3.1",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Facebook post/status link theke Post ID ber kore"
    },
    longDescription: {
      en: "Ekta Facebook post, video, ba photo-r link diye tar Post ID ber kore dey"
    },
    category: "Utility",
    guide: {
      en: "{pn} <facebook post/video/photo link>\n\nExample:\n{pn} https://www.facebook.com/100012345678901/posts/123456789012345"
    }
  },

  onStart: async function ({ args, message }) {
    const link = args.join(" ").trim();

    if (!link) {
      return message.reply(
        "❌ Ekta Facebook post/video/photo link din.\n\nExample:\n" +
        "getpostid https://www.facebook.com/100012345678901/posts/123456789012345"
      );
    }

    // /share/ link Facebook server-side theke bot-block kore, tai eta resolve
    // korar chesta na kore direct user ke bole dewa hocche
    if (/\/share\/(v|p|r)\//.test(link)) {
      return message.reply(
        "⚠️ Eta ekta 'share' link (short/redirect link) — Facebook eigula server theke automatically resolve korte dey na (bot-protection).\n\n" +
        "👉 Ki korte hobe:\n" +
        "1. Ei link ta phone/PC-r browser e open koro.\n" +
        "2. Post ta load howar por address bar e je full link ta ashbe (jeta te /posts/ ba /videos/ thakbe), seta copy koro.\n" +
        "3. Ei command e sei full link ta diye abar try koro."
      );
    }

    // Different Facebook link formats theke ID match korar jonno regex patterns
    const patterns = [
      /fbid=(\d+)/,                     // ?fbid=12345
      /story_fbid=(\d+)/,               // ?story_fbid=12345
      /\/posts\/(\d+)/,                 // /posts/12345
      /\/videos\/(\d+)/,                // /videos/12345
      /\/photos\/[^/]+\/(\d+)/,         // /photos/a.xxx/12345
      /\/permalink\/(\d+)/,             // /permalink/12345
      /\/reel\/(\d+)/,                  // /reel/12345
      /pfbid(\w+)/                      // pfbid share link (encoded id)
    ];

    let postId = null;
    let type = null;

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        postId = match[1];
        type = pattern.source;
        break;
      }
    }

    if (!postId) {
      return message.reply(
        "⚠️ Link theke Post ID khuje pawa jayni.\n" +
        "Full/valid Facebook post link disi kina check korun."
      );
    }

    const isEncoded = /pfbid/.test(link);

    return message.reply(
      "✅ Post ID paoa gese:\n\n" +
      `🆔 ID: ${postId}\n` +
      `🔗 Resolved link: ${link}\n` +
      (isEncoded
        ? "ℹ️ Note: Eta ekta encoded (pfbid) share ID, direct numeric post ID na."
        : "")
    );
  }
};
