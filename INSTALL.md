# Install
1. Node 18-22. Unzip, `cd TORU-ULTIMATE-main`.
2. `npm install` (use install, not `ci`; the FCA is downloaded from npm (@eryxenx/fca 1.1.7), there is no local fca/ folder). E2EE packages are optional and may fail harmlessly.
3. Put fresh browser cookies in `account.txt` (JSON array, cookie string or Netscape). The bot only reads it.
4. In `config.json` set `facebookAccount.userAgent` to your browser's exact User-Agent (recommended).
5. Rotate the DB password / Gmail secrets in config.json if this folder was ever shared.
6. `npm test` (optional), then `npm start`.
Expected log lines: `@eryxenx/fca v1.1.7`, `Cookie file loaded`, `FCA COMPAT added: ... wrapped: ...`, `SESSION GUARD Active`.
Never run `api.logoutFromFacebook()` if you want to stay logged in in the browser.
