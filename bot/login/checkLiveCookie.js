const axios = require("axios");

/**
 * Optional pre-flight cookie check.
 *
 * Safety rules (a mismatched fingerprint is a common reason Facebook drops a
 * browser session):
 *  - Only runs when facebookAccount.userAgent is set, and then sends exactly that
 *    UA with no made-up client hints. With no UA configured the check is skipped;
 *    the FCA validates the session itself during login.
 *  - A network / HTTP error is "unknown", never "invalid" (returns true), so a
 *    bad connection can no longer push the bot into the re-login flow.
 *  - Only a clear login-page answer counts as an invalid cookie.
 *
 * @param {string} cookie Cookie string as `c_user=123;xs=123;datr=123;`
 * @param {string} userAgent Browser User-Agent the cookies came from
 * @returns {Promise<Boolean>} false only if Facebook clearly asked for a login
 */
module.exports = async function (cookie, userAgent) {
	if (!userAgent || typeof userAgent !== "string" || !userAgent.trim()) return true;
	try {
		const response = await axios({
			url: "https://mbasic.facebook.com/settings",
			method: "GET",
			timeout: 15000,
			maxRedirects: 3,
			validateStatus: () => true,
			headers: {
				cookie,
				"user-agent": userAgent.trim(),
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"accept-language": "en-US,en;q=0.9"
			}
		});
		const body = typeof response.data === "string" ? response.data : "";
		if (response.status >= 500 || !body) return true;
		const loggedIn = body.includes("/privacy/xcs/action/logging/")
			|| body.includes("/notifications.php?")
			|| body.includes('href="/login/save-password-interstitial');
		if (loggedIn) return true;
		const loginPage = /name="login"|id="login_form"|action="\/login\/device-based|\/login\/\?next=/.test(body);
		return !loginPage;
	}
	catch (e) {
		return true;
	}
};
