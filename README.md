# Toru GoatBot Pro v8

Goat Bot V2 enhanced fork = toru base + Hridoy-V3 hardening + new automation layer.

## Run
```
npm install
npm start          # node index.js -> Goat.js  (node HRIDOY.js also works)
npm test           # 78 tests
npm run audit      # syntax, duplicate commands, missing packages, secret leaks
```
Node 18-22. Docker: `docker build -t toru .`

## From Hridoy-V3 (ported)
Two-ID failover (account.txt + account2.txt, `twoIdMode`), bounded listen supervisor, 3-format cookie loader (JSON / cookie string / Netscape, never password login), atomic JSON writes, anti-spam, maintenance mode, command performance log, NSFW gate (admin-only), audit tool, FCA = @eryxenx/fca 1.1.7 from npm (no local folder) (`fca-config.json`: auto-update, third-party login API and remote control all OFF), dashboard, EN/BN/HI/TL/AR/VI.

## New in v8 (config.json blocks)
| Feature | Config | How |
|---|---|---|
| Auto backup (local / Mongo / Telegram / Drive) | `autoBackup` | cron, `abackup now`, restore: `npm run restore -- <file>` |
| Per-group prefix / language / command on-off | `groupSettings` | `gset` |
| Reminders ("kal 9tay ...") | `reminders` | `remind` |
| Plugin hot-reload (no restart) | `hotReload` | save a file in scripts/cmds or events |
| Telegram / Discord bridge | `bridge` | status, say, threads, maintenance, reload, backup, ratelimit, logs, restart |
| Per-command rate limit | `rateLimit` | `ratelimit` |
| Status panel | - | `torustatus` |
| Optional read/delivered receipts (from toru) | `humanBehavior` | off by default |

Backups never contain account*.txt; with `redactSecrets` the config copy has passwords/tokens blanked and restore keeps your current secrets.

## Security
account.txt / account2.txt (live cookies) and the MongoDB URI in config.json are in this zip. Never commit/share it; set `MONGODB_URI` as env var and blank the URI if you publish. `update.js` (remote eval) was removed.
