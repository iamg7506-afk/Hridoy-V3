const { db, utils, GoatBot } = global;
const { config } = GoatBot;
const { log, getText } = utils;
const { creatingThreadData, creatingUserData } = global.client.database;

// E2EE JID threads contain "@" and are never stored in the standard DB.
function _isE2EEJID(id) {
	return typeof id === "string" && id.indexOf("@") !== -1;
}

module.exports = async function (usersData, threadsData, event) {
	const { threadID } = event;
	const senderID = event.senderID || event.author || event.userID;

	// ───────────── CHECK THREAD DATA ─────────────
	// E2EE threads (JID format) are NOT stored in the GoatBot DB.
	// Skip creation for them entirely — handlerEvents.js creates a synthetic
	// threadData object instead when the thread is an E2EE JID.
	if (threadID && !_isE2EEJID(threadID)) {
		try {
			if (global.temp.createThreadDataError.includes(threadID))
				return;

			const findInCreatingThreadData = creatingThreadData.find(t => t.threadID == threadID);
			if (!findInCreatingThreadData) {
				if (global.db.allThreadData.some(t => t.threadID == threadID))
					return;

				const threadData = await threadsData.create(threadID);
				log.info("DATABASE", `New Thread: ${threadID} | ${threadData.threadName} | ${config.database.type}`);
			}
			else {
				await findInCreatingThreadData.promise;
			}
		}
		catch (err) {
			if (err.name != "DATA_ALREADY_EXISTS") {
				global.temp.createThreadDataError.push(threadID);
				log.err("DATABASE", getText("handlerCheckData", "cantCreateThread", threadID), err);
			}
		}
	}

	// ──────────────── CHECK USER DATA ────────────────
	// E2EE senderIDs are numeric strings, so we DO create user records for them.
	if (senderID && !isNaN(senderID)) {
		try {
			const findInCreatingUserData = creatingUserData.find(u => u.userID == senderID);
			if (!findInCreatingUserData) {
				if (db.allUserData.some(u => u.userID == senderID))
					return;

				const userData = await usersData.create(senderID);
				log.info("DATABASE", `New User: ${senderID} | ${userData.name} | ${config.database.type}`);
			}
			else {
				await findInCreatingUserData.promise;
			}
		}
		catch (err) {
			if (err.name != "DATA_ALREADY_EXISTS")
				log.err("DATABASE", getText("handlerCheckData", "cantCreateUser", senderID), err);
		}
	}
};
