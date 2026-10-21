# hridoy-ultimate 9.0.0 integration - changelog

FCA: no local `fca/` folder any more. `@eryxenx/fca` 1.1.7 is downloaded from npm by `npm install` (package.json). Safe defaults (auto-update, remote control, third-party login API all OFF) live in `fca-config.json`. The notes below were written against an earlier local FCA copy.

## Audit findings -> fixes
| # | Finding | Fix |
|---|---|---|
| 1 | `api.logout()` in this FCA POSTs facebook.com/logout.php (ends your browser session too) | `fcaCompat`: logout is local-only; real one = `api.logoutFromFacebook()`; opt-in `fca.allowFacebookLogout` |
| 2 | `setActiveStatus`, `addFriendRequest`, `createCommentPost`, `httpPostFormData` missing in new FCA | ported via the FCA's `addExternalModule` hook (bot/login/fcaCompat.js) |
| 3 | ~270 reaction calls omit threadID; FCA falls back to `ctx.lastThreadID` (wrong group under concurrency) | messageID->threadID map (bounded, 4000) + one retry when MQTT is reconnecting; `utils.js` passes real threadID |
| 4 | `sendTypingIndicator(true, threadID)` wrong arg order; bot typing duplicated FCA's built-in typing | order normalised, bot's manual typing skipped when FCA typing exists |
| 5 | FCA typing auto-stop timer throws if MQTT dropped within 10s | guarded stop done in compat layer |
| 6 | Control events (`ready`, `stop_listen`, `account_inactive`) handled as fatal; every error -> `exit(2)` -> instant re-login | `listenSupervisor.js`: bounded jittered re-listen (6 tries); lost session = max 2 careful restarts/24h, then wait for new cookies |
| 7 | Silent e-mail/password login fallback if account.txt unparsable | removed; `appStateLoader.js` is read-only; opt-in `facebookAccount.allowPasswordLogin` |
| 8 | sessionGuard rewrote account.txt every 3 min | now writes `data/session/appstate.live.json`, every 15 min |
| 9 | Android Chrome 101 UA forwarded with desktop-browser cookies | stale default UA never forwarded; set `facebookAccount.userAgent` to your browser's UA |
| 10 | Unknown option keys warned on every start | only known keys forwarded |
| 11 | E2EE connect awaited before DB load (startup stall) | background connect; listener waits max 20s, re-listens once if it merges later |
| 12 | `activestatus` re-ran presence change on every boot | opt-in `fca.reassertActiveStatusOnBoot` |
| 13 | Clockwork 15-min listener cycle | jittered +-15% |
| 14 | https-proxy-agent ^7 at root vs FCA's v4 constructor use | root pinned to ^4; missing FCA deps added to package.json |

## Tests (offline, mocked transport)
`npm test` -> 16/16 bot tests (real FCA factories + fake MQTT/HTTP). (the FCA package ships no tests of its own.)
NOT verified: live login, MQTT, reactions, E2EE, the ported GraphQL doc_ids (may be stale), `npm install`.

## Not guaranteed
Facebook can still drop a session when the same cookies appear from a different UA/IP. Set the UA, run from the same network as your browser, and don't log out in the browser.

## Round 2 (from your startup log)
- Login confirmed working: hridoy-ultimate 9.0.0, cookies loaded read-only, SessionGuard writes to data/session.
- `botactive.js`: notice was sent to every group 5s after load, before MQTT was up -> every send fell back to the dead HTTP endpoint (404), dumped cookie-bearing error objects in the log and hit the send cap. Now: once per process, waits for the listener (+20s), 4-8s spacing, stops after 3 failures in a row, logs only the error message.
- E2EE: engine failed to load (needs `fca-unofficial` from GitHub etc.). `e2ee.enable` is now false; the failed attempt is gone from startup.
- Slow start: `sagor-video-downloader` (autolink.js) and `abir-photo360-apis` (photo.js) were npm-installed at runtime on every boot of the ephemeral container; now in package.json so they install at build.
- Left alone: duplicate command name `pinterest` (pinterest2.js overrides pinterest.js), `#L01f380.js` (old-format command the loader rejects), "[aura] font" warning.

## Round 3 (log stopped after "Hello World!")
- Startup froze right after `autolink.js` loaded `sagor-video-downloader` (it prints "Hello World!" at require time). Suspected cause, not proven: the package blocks or exits at load.
- loadScripts.js: `process.exit()` during a command's require is blocked; any `onLoad` still running after 20s no longer blocks startup; runtime package install timeout 180s -> 60s.
- autolink.js: the package is now required lazily (first link message), guarded against `process.exit`.

## Round 4 (log cleanup after first successful run)
Bot confirmed running: login OK, MQTT listening, commands answered.
- aura.js: font download saved HTTP error pages as .ttf (no status check) and tried the unsupported COLRv1 emoji font -> "Could not parse font file". Now validated, background, silent fallback to system fonts.
- botactive.js: no longer blocks the loader (the "onLoad still running after 20s" line).
- dashboard/app.js: expired Gmail refresh token no longer stops the dashboard opening (only e-mailed codes are disabled; one info line says how to renew).
- `#L01f380.js`: added lowercase `category` (loader rejected it).
- up.js: no more "cat /sys/class/thermal ... No such file" on hosts without a temperature sensor. uid.js: removed optional-font warning.
- fcaCompat.js: the FCA's per-message "mqtt puback ignored: Invalid header flag bits" warning (harmless broker flag byte) is hidden; all other FCA warnings still print.
Still shown on purpose: FCA "Initial page load doesn't match expected UA" (set facebookAccount.userAgent), and the config.json secret-in-file advisories (rotate those secrets).

## Round 5 (main.zip check - browser logout / cookie expiry)
- `bot/login/checkLiveCookie.js`: the pre-login cookie check sent a stale Android Chrome 101 User-Agent together with Windows/Edge client hints and `vi` language to mbasic.facebook.com. That fingerprint never matches the browser the cookies came from and is a likely reason Facebook ended the browser session. Now: it runs only when `facebookAccount.userAgent` is set, sends exactly that UA with no invented client hints, and a network/HTTP error counts as "unknown", not "invalid" (so a bad connection can no longer trigger the re-login flow).
- `config.json`: `restartListenMqtt.timeRestart` 15 min -> 45 min (fewer reconnects, less automation-like); `e2ee.enable` and `optionsFca.enableE2EE` -> false (engine needs extra packages, adds a device to the account; turn on only if you have them).
- `tests/checkLiveCookie.test.js`: 4 new offline tests. Suite: 21 total, 20 pass, 0 fail, 1 skipped.
- Checked, no change needed: syntax of all 651 JS files, all JSON, every local `require()`, every npm package vs package.json.
- Still needs you: set `facebookAccount.userAgent` to your browser's exact User-Agent; rotate the MongoDB password in config.json (it is in plain text); `npm install` and a live run were NOT possible here (no network).
