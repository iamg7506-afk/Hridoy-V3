"use strict";
/**
 * httpDefaults — global axios safety net for every command.
 *
 *  - default timeout (so a dead API can't hang a command forever)
 *  - ONE automatic retry for GET requests on network errors / 5xx
 *  - optional API base swap: set config.http.apiBaseUrl and every request that goes to
 *    https://hridoy-api.vercel.app/... is sent to your base URL instead.
 *
 * config.json -> http: { timeoutMs, retries, apiBaseUrl, rewriteFrom }
 */
const axios = require("axios");

module.exports = function installHttpDefaults(config) {
	if (axios.__toruPatched) return;
	axios.__toruPatched = true;

	const cfg = () => (global.GoatBot?.config || config || {}).http || {};

	axios.interceptors.request.use(req => {
		const c = cfg();
		if (!req.timeout) req.timeout = Number(c.timeoutMs) > 0 ? Number(c.timeoutMs) : 60000;

		const base = String(c.apiBaseUrl || "").replace(/\/+$/, "");
		const from = String(c.rewriteFrom || "https://hridoy-api.vercel.app").replace(/\/+$/, "");
		if (base && typeof req.url === "string" && req.url.startsWith(from))
			req.url = base + req.url.slice(from.length);
		return req;
	});

	axios.interceptors.response.use(undefined, async err => {
		const cfgReq = err.config;
		if (!cfgReq) throw err;
		const method = String(cfgReq.method || "get").toLowerCase();
		const max = Number.isInteger(cfg().retries) ? cfg().retries : 1;
		const status = err.response?.status;
		const retryable = !err.response || status >= 500;
		cfgReq.__retryCount = cfgReq.__retryCount || 0;
		if (method !== "get" || !retryable || cfgReq.__retryCount >= max) throw err;
		cfgReq.__retryCount++;
		await new Promise(r => setTimeout(r, 1500 * cfgReq.__retryCount));
		return axios(cfgReq);
	});
};
