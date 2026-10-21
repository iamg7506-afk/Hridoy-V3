const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const axios = require("axios");

const PASTEBIN_API = "https://pastebin-v2-chi.vercel.app";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const PAGE_SIZE = 15;

// True root = one level above the commands folder (so we can also browse "events", etc.)
const ROOT_DIR = path.join(__dirname, "..");
// Where this command file itself lives, expressed relative to ROOT_DIR (e.g. "commands")
const COMMANDS_RELDIR = path.relative(ROOT_DIR, __dirname).split(path.sep).join("/");

// Noise we don't want cluttering the root listing
const IGNORE_NAMES = new Set(["node_modules", ".git", ".env", "package-lock.json"]);

function isImageFile(name) {
    return IMAGE_EXTENSIONS.includes(path.extname(name).toLowerCase());
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(ms) {
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "unknown";
    return d.toISOString().slice(0, 16).replace("T", " ");
}

// Security helper: make sure `childAbs` really lives inside `parentAbs`
// (blocks "../.." style escapes on rename/move destinations).
function isPathInside(childAbs, parentAbs) {
    const rel = path.relative(parentAbs, childAbs);
    return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

// Rejects filenames/paths that try to escape the current folder.
function isSafeName(name) {
    if (!name) return false;
    if (name.includes("..")) return false;
    return true;
}

function listDir(dirAbs) {
    const names = fs.readdirSync(dirAbs);
    return names
        .filter(name => !name.startsWith(".") && !IGNORE_NAMES.has(name))
        .map(name => {
            const full = path.join(dirAbs, name);
            const stat = fs.statSync(full);
            return {
                name,
                isDir: stat.isDirectory(),
                isImage: !stat.isDirectory() && isImageFile(name),
                size: stat.isDirectory() ? null : stat.size,
                mtimeMs: stat.mtimeMs
            };
        }).sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
}

function renderList(relDir, entries, page) {
    const title = relDir ? relDir.split("/").pop() : "root";
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(page || 0, 0), totalPages - 1);
    const start = safePage * PAGE_SIZE;
    const pageEntries = entries.slice(start, start + PAGE_SIZE);

    let msg = `🗂️ 『 ${title} 』`;
    if (totalPages > 1) msg += ` [page ${safePage + 1}/${totalPages}]`;
    msg += `\n`;

    pageEntries.forEach((e, idx) => {
        const absIdx = start + idx;
        const branch = idx === pageEntries.length - 1 ? "└" : "├";
        const icon = e.isDir ? "📂" : (e.isImage ? "🖼️" : "📄");
        let meta = "";
        if (!e.isDir) meta = ` (${formatSize(e.size)}, ${formatDate(e.mtimeMs)})`;
        msg += `${branch}${absIdx + 1}. ${icon} ${e.name}${meta}\n`;
    });
    if (entries.length === 0) msg += "『 empty 』\n";

    msg += `\n▭▭▭▭▭▭▭▭▭▭▭▭▭▭\n`;
    msg += `✦Reply a number to open\n`;
    if (relDir) msg += `✦Reply "back" ↩️ to go up a level\n`;
    if (safePage > 0) msg += `✦Reply "prev" ⬅️ for the previous page\n`;
    if (safePage < totalPages - 1) msg += `✦Reply "next" ➡️ for the next page\n`;
    msg += `✦Reply "delete 1,2,3" 🗑️ to delete\n`;
    msg += `✦Reply "raw 1,2,3" 🔗 to get paste links\n`;
    msg += `✦Reply "zip 1,2,3" 🗜️ to download as a zip\n`;
    msg += `✦Reply "rename 1 newname.js" ✏️ to rename\n`;
    msg += `✦Reply "move 1 commands/sub" 🚚 to move\n`;
    msg += `✦Send/attach a file with your reply 📤 to upload it here\n`;
    msg += `▭▭▭▭▭▭▭▭▭▭▭▭▭▭`;
    return msg;
}

// Removes the previous "page" message once a new one has been sent
function deleteOldPage(api, Reply) {
    if (!Reply || !Reply.messageID) return;
    try {
        api.unsendMessage(Reply.messageID, () => {});
    } catch (e) {
        // ignore - message may be too old to unsend, or already gone
    }
}

function registerReply(api, event, info, data, oldReply) {
    if (!info) return;
    global.GoatBot.onReply.set(info.messageID, Object.assign({
        commandName: "file",
        messageID: info.messageID,
        author: event.senderID
    }, data));
    deleteOldPage(api, oldReply);
}

function sendPage(api, event, relDir, entries, page, oldReply) {
    return api.sendMessage(renderList(relDir, entries, page), event.threadID, (e, info) => {
        if (e || !info) return;
        registerReply(api, event, info, { relDir, entries, page }, oldReply);
    });
}

async function pasteAndReply(api, event, filename, code) {
    try {
        const res = await axios.post(`${PASTEBIN_API}/api/paste`, { code });
        if (res.data && res.data.url) {
            return `📄 ${filename}\n🔗 ${res.data.url}\n`;
        }
        return `⚠️ ${filename} - upload failed, no link received\n`;
    } catch (err) {
        return `❌ ${filename} - upload failed: ${err.message}\n`;
    }
}

async function downloadAttachment(url, destAbs) {
    const res = await axios({ method: "get", url, responseType: "stream" });
    await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destAbs);
        res.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}

function guessExt(type) {
    if (!type) return "";
    if (type === "photo") return ".jpg";
    if (type === "video") return ".mp4";
    if (type === "audio") return ".mp3";
    return "";
}

module.exports = {
  config: {
    name: "files",
    version: "2.0.2",
    author: "HR ID OY",
    countDown: 5,
    role: 2,
    shortDescription: "Browse/manage command files",
    longDescription: "Browse, view (with image preview), rename, move, zip, upload, and delete files/folders across the bot's project (commands, events, etc).",
    category: "System",
    guide: {
      en:
        "{pn} — show all files/folders in the commands folder\n" +
        "{pn} start <text> — filter files starting with text\n" +
        "{pn} ext <text> — filter files by extension\n" +
        "{pn} <text> — filter files containing text\n" +
        "{pn} help — show this guide\n" +
        "Reply a number to open a folder or preview an image\n" +
        "Reply \"back\" to go up a level\n" +
        "Reply \"next\" / \"prev\" to change page\n" +
        "Reply \"delete 1,2,3\" to delete\n" +
        "Reply \"raw 1,2,3\" to get paste links for those files\n" +
        "Reply \"zip 1,2,3\" to download a zip of those files/folders\n" +
        "Reply \"rename 1 newname.js\" to rename an entry\n" +
        "Reply \"move 1 commands/sub\" to move an entry into another folder\n" +
        "Reply with an attached file to upload it into the folder you're viewing"
    }
  },

  onReply: async function ({ api, event, Reply }) {
    if (event.senderID != Reply.author) return;
    const body = (event.body || "").trim();

    if (Reply.stage === "viewFile") {
        if (body.toLowerCase() !== "raw") {
            return api.sendMessage('❌ Reply "raw" to get a paste link, or ignore this message.', event.threadID, event.messageID);
        }
        const abs = path.join(ROOT_DIR, Reply.filePath);
        let code;
        try {
            code = fs.readFileSync(abs, "utf8");
        } catch (e) {
            return api.sendMessage("❌ Couldn't read that file (it may have been deleted).", event.threadID, event.messageID);
        }
        const msg = await pasteAndReply(api, event, path.basename(Reply.filePath), code);
        return api.sendMessage(`📄 File: ${path.basename(Reply.filePath)}\n${msg}`, event.threadID, event.messageID);
    }

    const relDir = Reply.relDir || "";
    const dirAbs = path.join(ROOT_DIR, relDir);
    const entries = Reply.entries;
    const page = Reply.page || 0;

    // --- Upload: any attachment sent while browsing a folder is saved into it ---
    if (event.attachments && event.attachments.length > 0) {
        let msg = "";
        for (const att of event.attachments) {
            const rawName = att.filename || `upload_${Date.now()}${guessExt(att.type)}`;
            let destName = rawName;
            let destAbs = path.join(dirAbs, destName);
            if (!isPathInside(destAbs, dirAbs)) { msg += `❌ ${rawName} - unsafe filename, skipped\n`; continue; }
            if (fs.existsSync(destAbs)) {
                const ext = path.extname(destName);
                const base = path.basename(destName, ext);
                destName = `${base}_${Date.now()}${ext}`;
                destAbs = path.join(dirAbs, destName);
            }
            try {
                await downloadAttachment(att.url, destAbs);
                msg += `📤 saved as ${destName}\n`;
            } catch (err) {
                msg += `❌ ${rawName} - upload failed: ${err.message}\n`;
            }
        }
        const freshEntries = listDir(dirAbs);
        await api.sendMessage(`⚡️Upload result:\n\n${msg}`, event.threadID, event.messageID);
        return sendPage(api, event, relDir, freshEntries, 0, Reply);
    }

    if (body.toLowerCase() === "back") {
        if (!relDir) return api.sendMessage("⚡️Already at the project root.", event.threadID, event.messageID);
        const parent = relDir.includes("/") ? relDir.slice(0, relDir.lastIndexOf("/")) : "";
        const parentAbs = path.join(ROOT_DIR, parent);
        const parentEntries = listDir(parentAbs);
        return sendPage(api, event, parent, parentEntries, 0, Reply);
    }

    if (body.toLowerCase() === "next") {
        const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
        const nextPage = Math.min(page + 1, totalPages - 1);
        if (nextPage === page) return api.sendMessage("⚡️Already on the last page.", event.threadID, event.messageID);
        return sendPage(api, event, relDir, entries, nextPage, Reply);
    }

    if (body.toLowerCase() === "prev") {
        const prevPage = Math.max(page - 1, 0);
        if (prevPage === page) return api.sendMessage("⚡️Already on the first page.", event.threadID, event.messageID);
        return sendPage(api, event, relDir, entries, prevPage, Reply);
    }

    const deleteMatch = body.match(/^delete\s+(.+)$/i);
    if (deleteMatch) {
        const nums = deleteMatch[1].trim().split(/\s+/).map(n => parseInt(n));
        let msg = "";
        for (const num of nums) {
            const target = entries[num - 1];
            if (!target) { msg += `❌ ${num} invalid\n`; continue; }
            const full = path.join(dirAbs, target.name);
            try {
                if (target.isDir) fs.rmdirSync(full, { recursive: true });
                else fs.unlinkSync(full);
                msg += `${target.isDir ? "📂" : "📄"} ${target.name} deleted\n`;
            } catch (err) {
                msg += `❌ Failed: ${target.name} (${err.message})\n`;
            }
        }
        return api.sendMessage(`⚡️Done:\n\n${msg}`, event.threadID, event.messageID);
    }

    const rawMatch = body.match(/^raw\s+(.+)$/i);
    if (rawMatch) {
        const nums = rawMatch[1].trim().split(/\s+/).map(n => parseInt(n));
        let msg = "";
        for (const num of nums) {
            const target = entries[num - 1];
            if (!target) { msg += `❌ ${num} invalid\n`; continue; }
            if (target.isDir) { msg += `❌ ${num}. ${target.name} is a folder, skipped\n`; continue; }
            if (target.isImage) { msg += `❌ ${num}. ${target.name} is an image, skipped\n`; continue; }
            const full = path.join(dirAbs, target.name);
            let code;
            try {
                code = fs.readFileSync(full, "utf8");
            } catch (e) {
                msg += `❌ ${num}. ${target.name} couldn't be read\n`;
                continue;
            }
            msg += await pasteAndReply(api, event, target.name, code);
        }
        return api.sendMessage(`⚡️Raw links:\n\n${msg}`, event.threadID, event.messageID);
    }

    // --- Zip: bundle selected files/folders and send back as an attachment ---
    const zipMatch = body.match(/^zip\s+(.+)$/i);
    if (zipMatch) {
        let archiver;
        try {
            archiver = require("archiver");
        } catch (e) {
            return api.sendMessage('❌ The "archiver" package isn\'t installed. Run `npm install archiver` on the bot server, then try again.', event.threadID, event.messageID);
        }
        const nums = zipMatch[1].trim().split(/\s+/).map(n => parseInt(n));
        const targets = [];
        let msg = "";
        for (const num of nums) {
            const target = entries[num - 1];
            if (!target) { msg += `❌ ${num} invalid\n`; continue; }
            targets.push(target);
        }
        if (targets.length === 0) {
            return api.sendMessage(`❌ Nothing valid to zip.\n${msg}`, event.threadID, event.messageID);
        }
        const zipPath = path.join(os.tmpdir(), `file_cmd_${Date.now()}.zip`);
        try {
            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(zipPath);
                const archive = archiver("zip", { zlib: { level: 9 } });
                output.on("close", resolve);
                archive.on("error", reject);
                archive.pipe(output);
                for (const target of targets) {
                    const full = path.join(dirAbs, target.name);
                    if (target.isDir) archive.directory(full, target.name);
                    else archive.file(full, { name: target.name });
                }
                archive.finalize();
            });
            await api.sendMessage(
                { body: `🗜️ Zipped ${targets.length} item(s)${msg ? `\n\n${msg}` : ""}`, attachment: fs.createReadStream(zipPath) },
                event.threadID,
                event.messageID
            );
        } catch (err) {
            await api.sendMessage(`❌ Zip failed: ${err.message}`, event.threadID, event.messageID);
        } finally {
            fs.unlink(zipPath, () => {});
        }
        return;
    }

    // --- Rename ---
    const renameMatch = body.match(/^rename\s+(\d+)\s+(.+)$/i);
    if (renameMatch) {
        const num = parseInt(renameMatch[1]);
        const newName = renameMatch[2].trim();
        const target = entries[num - 1];
        if (!target) return api.sendMessage(`❌ ${num} invalid`, event.threadID, event.messageID);
        if (!isSafeName(newName)) return api.sendMessage("❌ Invalid new name.", event.threadID, event.messageID);
        const oldAbs = path.join(dirAbs, target.name);
        const newAbs = path.join(dirAbs, newName);
        if (!isPathInside(newAbs, dirAbs)) return api.sendMessage("❌ That name would leave the current folder.", event.threadID, event.messageID);
        if (fs.existsSync(newAbs)) return api.sendMessage(`❌ "${newName}" already exists here.`, event.threadID, event.messageID);
        try {
            fs.renameSync(oldAbs, newAbs);
        } catch (err) {
            return api.sendMessage(`❌ Rename failed: ${err.message}`, event.threadID, event.messageID);
        }
        await api.sendMessage(`✏️ Renamed "${target.name}" → "${newName}"`, event.threadID, event.messageID);
        const freshEntries = listDir(dirAbs);
        return sendPage(api, event, relDir, freshEntries, 0, Reply);
    }

    // --- Move ---
    const moveMatch = body.match(/^move\s+(\d+)\s+(.+)$/i);
    if (moveMatch) {
        const num = parseInt(moveMatch[1]);
        const destRel = moveMatch[2].trim().replace(/^\/+/, "");
        const target = entries[num - 1];
        if (!target) return api.sendMessage(`❌ ${num} invalid`, event.threadID, event.messageID);
        if (!isSafeName(destRel)) return api.sendMessage("❌ Invalid destination path.", event.threadID, event.messageID);
        const destDirAbs = path.join(ROOT_DIR, destRel);
        if (!isPathInside(destDirAbs, ROOT_DIR)) return api.sendMessage("❌ That destination is outside the project.", event.threadID, event.messageID);
        if (!fs.existsSync(destDirAbs) || !fs.statSync(destDirAbs).isDirectory()) {
            return api.sendMessage(`❌ "${destRel}" isn't an existing folder.`, event.threadID, event.messageID);
        }
        const srcAbs = path.join(dirAbs, target.name);
        const destAbs = path.join(destDirAbs, target.name);
        if (fs.existsSync(destAbs)) return api.sendMessage(`❌ "${target.name}" already exists in "${destRel}".`, event.threadID, event.messageID);
        try {
            await fs.move(srcAbs, destAbs);
        } catch (err) {
            return api.sendMessage(`❌ Move failed: ${err.message}`, event.threadID, event.messageID);
        }
        await api.sendMessage(`🚚 Moved "${target.name}" → "${destRel}/"`, event.threadID, event.messageID);
        const freshEntries = listDir(dirAbs);
        return sendPage(api, event, relDir, freshEntries, 0, Reply);
    }

    const num = parseInt(body, 10);
    if (!Number.isInteger(num) || !entries[num - 1]) {
        return api.sendMessage('❌ Invalid reply. Send a number, "back", "next"/"prev", or a command like "delete 1,2,3".', event.threadID, event.messageID);
    }
    const entry = entries[num - 1];
    const entryAbs = path.join(dirAbs, entry.name);
    const newRelDir = relDir ? `${relDir}/${entry.name}` : entry.name;

    if (entry.isDir) {
        const subEntries = listDir(entryAbs);
        return sendPage(api, event, newRelDir, subEntries, 0, Reply);
    }

    if (entry.isImage) {
        return api.sendMessage(
            { body: `🖼️ ${entry.name} (${formatSize(entry.size)}, ${formatDate(entry.mtimeMs)})`, attachment: fs.createReadStream(entryAbs) },
            event.threadID,
            (e, info) => {
                if (e) return;
                deleteOldPage(api, Reply);
            },
            event.messageID
        );
    }

    return api.sendMessage(
        `📄 ${entry.name} (${formatSize(entry.size)}, ${formatDate(entry.mtimeMs)})\n✦Reply "raw" to get a paste link for this file\n✦Or use the delete command to remove it`,
        event.threadID,
        (e, info) => {
            if (e || !info) return;
            registerReply(api, event, info, { stage: "viewFile", filePath: newRelDir }, Reply);
        },
        event.messageID
    );
  },

  onStart: async function ({ api, event, args }) {
    if (args[0] === "help") {
        return api.sendMessage(
`How to use:
•start <text> — filter files starting with text
•ext <text> — filter files by extension
•<text> — filter files containing text
•(blank) — show all files/folders
•Reply a number to open a folder or preview an image
•Reply "back" to go up a level
•Reply "next" / "prev" to change page
•Reply "delete 1,2,3" to delete
•Reply "raw 1,2,3" to get paste links for those files
•Reply "zip 1,2,3" to download a zip of those files/folders
•Reply "rename 1 newname.js" to rename an entry
•Reply "move 1 commands/sub" to move an entry into another folder
•Reply with an attached file to upload it into the folder you're viewing`,
            event.threadID, event.messageID);
    }

    let entries = listDir(path.join(ROOT_DIR, COMMANDS_RELDIR));
    let key = "⚡️All files/folders in commands:";

    if (args[0] === "start" && args[1]) {
        const word = args.slice(1).join(" ");
        entries = entries.filter(e => e.name.startsWith(word));
        key = `⚡️Files starting with: ${word}`;
    } else if (args[0] === "ext" && args[1]) {
        const ext = args[1];
        entries = entries.filter(e => e.name.endsWith(ext));
        key = `⚡️Files ending with: ${ext}`;
    } else if (args[0]) {
        const word = args.join(" ");
        entries = entries.filter(e => e.name.includes(word));
        key = `⚡️Files containing: ${word}`;
    }

    if (entries.length === 0) return api.sendMessage("⚡️No matching files/folders found.", event.threadID, event.messageID);

    return api.sendMessage(`${key}\n\n${renderList(COMMANDS_RELDIR, entries, 0)}`, event.threadID, (e, info) => {
        if (e || !info) return;
        registerReply(api, event, info, { relDir: COMMANDS_RELDIR, entries, page: 0 });
    });
  }
};
