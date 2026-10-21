# Toru bot - full analysis (2026-10-19)

Method: static analysis only (no node_modules, no network in the sandbox). Nothing here was run against live Facebook.

## What was checked
| Check | Result |
|---|---|
| Syntax of all 700+ JS files, all JSON files | 0 errors |
| Every local `require()` resolves | 0 missing |
| Every npm package a file requires is in package.json | OK (3 hits are browser JS in dashboard, not Node) |
| Undefined variables (acorn scope scan, all files) | 4 real bugs found -> fixed, now 0 |
| 543 commands: config/name/category/onStart | all load; 0 duplicate names, 0 alias-vs-alias clash |
| Command <-> system: getLang keys, usersData/threadsData/globalData methods, utils.* functions, handler params | all match |
| Offline test suite | 16 pass, 0 fail, 1 skipped (needs the FCA installed) |

## Fixes made
1. Goat.js: config check ran `npx jsonlint` once per file (slow, can try to download). Now in-process JSON.parse with line/column on error.
2. login.js: GBAN list, notification and worldtimeapi calls had no short timeout, and the global retry could turn one dead host into ~2 min of silent startup. Now 6-8s, no retry, safe fallback. E2EE wait before first listen 20s -> 10s.
3. index.js: hard-coded port 3000 and no error handler (a busy port killed the supervisor, so the bot never started). Now uses PORT env, and a listen error only logs a warning.
4. database/controller/dashBoardData.js: `remove()` checked an undefined `threadID`, so it always threw INVALID_EMAIL. Fixed to `email`.
5. mistake.js, remini.js, removebg.js: `api` was not defined in onStart. Now `message.reply`.
6. loadScripts.js: read `config.name` before checking config exists (confusing TypeError). Order fixed.
7. handlerAction.js: anti-spam tracker never freed old users. Idle entries now pruned every 10 min.
8. 22 aliases that could never fire (the same word is a real command name) removed from 20 command files, e.g. `status`, `ss`, `pfp`, `sh`, `jail`.

## Not fixed - needs you
- **FCA not verifiable here.** package.json asks for `hridoy-ultimate` 9.0.1 from npm and the FCA is not in the zip. I could not check that this exact version exists, or that every method the bot calls exists in it (sendMessage, setMessageReaction, editMessage, getThreadInfo, changeNickname, etc.). If `npm install` gives a 404 for it, that is the cause.
- **config.json has `e2ee.enable: true`.** The old changelog turned it off because the E2EE engine needs extra packages and adds a device to your account. If the log shows "[E2EE] Could not connect", set it to false.
- **Secrets are inside the zip**: account.txt cookies, MongoDB URI, Gmail client secret, reCAPTCHA keys. Rotate them if this zip was shared anywhere.
- Gmail `refreshToken` is 1 character - invalid, only dashboard e-mail codes are affected.
- package.json uses `*` for abir-photo360-apis, sagor-video-downloader, yumi-json-bigint. Pin them after a good run so a new release cannot break startup.
- MQTT listener is recycled every ~15 min (config `restartListenMqtt`). That was added for silent reactions; if reactions are stable, raise `timeRestart` to 2700000 - fewer reconnects look less like automation.
- 14 commands have no `role` (default 0 = everyone) - all harmless fun/image/system-info commands.

## First-run checklist
`npm install` -> set `facebookAccount.userAgent` to your browser's exact User-Agent -> `npm start`.
Expected: `hridoy-ultimate v...`, `Cookie file loaded`, `FCA COMPAT added...`, `SESSION GUARD Active`, no `[✖]` lines.
