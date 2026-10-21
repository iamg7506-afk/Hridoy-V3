const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// ── API base (only this URL lives here) ──
const BASE = "https://hridoy-api.vercel.app";

const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

async function getAvatar(cfg, uid) {
	const res = await axios.get(fill(cfg.avatarUrl, { uid }), { responseType: "arraybuffer" });
	return loadImage(Buffer.from(res.data));
}

function drawCircleImage(ctx, img, pos, outline, sx, sy) {
	const { cx, cy, r } = pos;
	const s = (sx + sy) / 2;
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx * sx, cy * sy, r * s, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(img, (cx - r) * sx, (cy - r) * sy, r * 2 * s, r * 2 * s);
	ctx.restore();

	if (outline) {
		ctx.beginPath();
		ctx.arc(cx * sx, cy * sy, r * s, 0, Math.PI * 2);
		ctx.lineWidth = outline.width * s;
		ctx.strokeStyle = outline.color;
		ctx.stroke();
	}
}

function drawNameTag(ctx, name, cx, y, sx, sy, color, tag) {
	const s = (sx + sy) / 2;
	const original = String(name || "User");
	let text = original;
	const fontSize = tag.fontSize * s;
	ctx.font = `bold ${fontSize}px sans-serif`;
	const maxW = tag.maxWidth * sx;
	while (ctx.measureText(text).width > maxW && text.length > 3) text = text.slice(0, -2);
	if (text !== original) text += "…";

	const padX = 10 * s, h = fontSize + 12 * s;
	const w = ctx.measureText(text).width + padX * 2;
	const x = cx * sx - w / 2;
	const top = y * sy - h;

	ctx.fillStyle = color;
	ctx.beginPath();
	if (ctx.roundRect) ctx.roundRect(x, top, w, h, tag.radius * s);
	else ctx.rect(x, top, w, h);
	ctx.fill();

	ctx.fillStyle = tag.textColor;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, cx * sx, top + h / 2);
}

module.exports = {
	config: {
		name: "lucca",
		aliases: ["luccacard"],
		version: "2.0",
		author: "HR ID OY",
		countDown: 5,
		role: 0,
		description: "Police vs Lucca card meme (tag/reply someone)",
		category: "Tag Fun",
		guide: "{pn} @tag | reply | uid"
	},

	onStart: async function ({ api, event, args, message, usersData }) {
		const { senderID, mentions, messageReply } = event;

		let cfg;
		try {
			// Template url, avatar url, face positions, name-tag style, captions — all from the API
			const { data } = await axios.get(`${BASE}/api/images/lucca`, { timeout: 15000 });
			cfg = data;
		} catch (e) {
			console.error("Lucca API error:", e.message);
			return message.reply("Error hoyeche, abar try korun.");
		}

		const txt = cfg.texts || {};

		let targetID;
		if (messageReply) targetID = messageReply.senderID;
		else if (Object.keys(mentions || {}).length) targetID = Object.keys(mentions)[0];
		else if (args[0] && /^\d+$/.test(args[0])) targetID = args[0];
		else return message.reply(txt.noTarget || "Kauke tag korun, reply din ba uid din.");

		const outPath = path.join(__dirname, "tmp", `lucca_${senderID}_${Date.now()}.png`);
		await fs.ensureDir(path.dirname(outPath));

		try {
			const [tpl, userImg, targetImg] = await Promise.all([
				axios.get(cfg.url, { responseType: "arraybuffer" }).then(r => loadImage(Buffer.from(r.data))),
				getAvatar(cfg, senderID),
				getAvatar(cfg, targetID)
			]);

			const W = tpl.width, H = tpl.height;
			const sx = W / cfg.canvasSize.w, sy = H / cfg.canvasSize.h;

			const canvas = createCanvas(W, H);
			const ctx = canvas.getContext("2d");
			ctx.drawImage(tpl, 0, 0, W, H);

			const { sender: POLICE, target: THIEF } = cfg.positions;
			drawCircleImage(ctx, userImg, POLICE, cfg.outline, sx, sy);   // police = user
			drawCircleImage(ctx, targetImg, THIEF, cfg.outline, sx, sy);  // chor = target

			const [senderName, targetName] = await Promise.all([
				usersData.getName(senderID),
				usersData.getName(targetID)
			]);
			const tag = cfg.nameTag;
			drawNameTag(ctx, senderName, POLICE.cx, POLICE.cy - tag.offsetY, sx, sy, tag.senderColor, tag);
			drawNameTag(ctx, targetName, THIEF.cx, THIEF.cy - tag.offsetY, sx, sy, tag.targetColor, tag);

			fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

			const msgs = cfg.messages && cfg.messages.length ? cfg.messages : [""];
			const body = fill(msgs[Math.floor(Math.random() * msgs.length)], { sender: senderName, target: targetName });

			await message.reply({
				body,
				attachment: fs.createReadStream(outPath)
			});
		} catch (e) {
			console.error(e);
			message.reply(txt.error || "Error hoyeche, abar try korun.");
		} finally {
			fs.remove(outPath).catch(() => {});
		}
	}
};
