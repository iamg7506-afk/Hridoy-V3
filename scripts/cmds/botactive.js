module.exports = {
	config: {
		name: "botactive",
		version: "1.2",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		description: "Notify all groups when the bot starts",
		category: "System",
		guide: {
			en: "{pn}: manually resend the bot-active notice to all groups"
		}
	},

	// 🔔 Auto notify all groups when the bot starts
	onLoad: async function ({ api, threadsData }) {
		// Once per process, and only after the MQTT listener is really up. Sending earlier made every
		// message fall back to the dead HTTP endpoint (404), dumped cookie-bearing error objects into the
		// log and burned the send cap. Spaced out, and aborted after 3 consecutive failures.
		if (global.__botActiveNoticeStarted) return;
		global.__botActiveNoticeStarted = true;
		const sleep = ms => new Promise(r => setTimeout(r, ms));
		(async () => { try {
			for (let i = 0; i < 120 && !global.GoatBot?.Listening; i++) await sleep(5000);
			await sleep(20000);
			const allThreads = (await threadsData.getAll()).filter(t => t.isGroup);
			let sent = 0, failures = 0;
			for (const thread of allThreads) {
				try {
					await api.sendMessage(
						"╭──「 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 」──╮\n\n" +
						"   🤖 𝑩𝒐𝒕 𝒊𝒔 𝒏𝒐𝒘 𝑨𝒄𝒕𝒊𝒗𝒆 ✅\n\n" +
						"   📖 𝑻𝒚𝒑𝒆 ‹ .help › 𝒕𝒐 𝒔𝒆𝒆\n" +
						"   𝒂𝒍𝒍 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒄𝒐𝒎𝒎𝒂𝒏𝒅𝒔\n\n" +
						"╰───────────────╯",
						thread.threadID
					);
					sent++; failures = 0;
				} catch (err) {
					failures++;
					console.error(`[BOT ACTIVE] Failed to notify ${thread.threadID}: ${err?.message || String(err).slice(0, 120)}`);
					if (failures >= 3) { console.error("[BOT ACTIVE] 3 failures in a row - stopping the notice."); break; }
				}
				await sleep(4000 + Math.floor(Math.random() * 4000));
			}
			console.log(`[BOT ACTIVE] Notice sent to ${sent}/${allThreads.length} groups.`);
		} catch (err) {
			console.error("[BOT ACTIVE ERROR]", err?.message || err);
		} })();
	},

	// 🔁 Manual trigger (admin only): resend the notice on demand
	onStart: async function ({ api, event, threadsData }) {
		const allThreads = (await threadsData.getAll()).filter(t => t.isGroup);

		for (const thread of allThreads) {
			try {
				await api.sendMessage(
					"╭───「 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 」───╮\n\n" +
					"   🤖 𝑩𝒐𝒕 𝒊𝒔 𝒏𝒐𝒘 𝑨𝒄𝒕𝒊𝒗𝒆 ✅\n\n" +
					"   📖 𝑻𝒚𝒑𝒆 " + "‹ .help ›" + " 𝒕𝒐 𝒔𝒆𝒆\n" +
					"   𝒂𝒍𝒍 𝒂𝒗𝒂𝒊𝒍𝒂𝒃𝒍𝒆 𝒄𝒐𝒎𝒎𝒂𝒏𝒅𝒔\n\n" +
					"╰──────────────╯",
					thread.threadID
				);
			} catch (err) {
				console.error(`[BOT ACTIVE] Failed to notify ${thread.threadID}:`, err?.message || err);
			}
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		return api.sendMessage(`✨ 𝑵𝒐𝒕𝒊𝒇𝒊𝒆𝒅 ${allThreads.length} 𝒈𝒓𝒐𝒖𝒑(𝒔) ✅`, event.threadID);
	}
};
