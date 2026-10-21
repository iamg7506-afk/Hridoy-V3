module.exports = {
	config: {
		name: "fbcomment",
		aliases: ["comment", "postcomment"],
		version: "1.0.2",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		description: "Post a comment on a specific Facebook post",
		category: "Utility",
		guide: {
			en: "{pn} <postID> <comment text>"
		}
	},

	onStart: async function ({ message, args, api }) {
		const postID = args[0];
		const text = args.slice(1).join(" ");

		if (!postID || isNaN(postID)) {
			return message.reply("❌ Please provide a valid numeric Facebook post ID.\n\nUsage: {pn} <postID> <comment text>");
		}
		if (!text) {
			return message.reply("❌ Please provide the comment text.\n\nUsage: {pn} <postID> <comment text>");
		}

		try {
			// IMPORTANT: this FCA's src/createCommentPost.js has two bugs
			// verified during review:
			//   1) if a callback function is passed as the 3rd argument,
			//      the library itself throws a ReferenceError (it
			//      references an undefined variable named "calback").
			//   2) on failure it calls its internal callback as
			//      cb(null, err) instead of cb(err) — which means its
			//      Promise RESOLVES (not rejects) with the raw error
			//      object as the "successful" result.
			// We avoid both by never passing a callback (Promise-only)
			// and by validating the shape of the resolved value instead
			// of trusting resolve/reject.
			const result = await api.createCommentPost(text, postID);

			const looksLikeError = !result || result.error || result.errors || !result.id;
			if (looksLikeError) {
				throw (result && (result.error || result.errors)) || result || new Error("Unknown error posting comment");
			}

			return message.reply(`✅ Comment posted successfully!${result.url ? `\n🔗 ${result.url}` : ""}`);
		}
		catch (err) {
			console.error("[fbcomment] Failed:", err);
			return message.reply(`❌ Failed to post comment: ${(err && (err.error || err.message)) || JSON.stringify(err)}`);
		}
	}
};