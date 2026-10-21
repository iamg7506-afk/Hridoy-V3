const { loadImage, createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

function deterministicCount(uid) {
	let hash = 0;
	for (let i = 0; i < uid.length; i++) {
		hash = uid.charCodeAt(i) + ((hash << 5) - hash);
	}
	return (Math.abs(hash) % 20) + 1;
}

function seededRandom(seed) {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

module.exports = {
	config: {
		name: "bodycount",
		version: "1.2",
		author: "HR ID OY",
		countDown: 5,
		role: 0,
		shortDescription: "Body count meme",
		category: "Tag Fun",
		guide: {
			en: "{pn} @mention OR reply"
		}
	},

	onStart: async function ({ event, message, usersData }) {
		try {
			let uid;

			// mention
			if (Object.keys(event.mentions || {}).length > 0) {
				uid = Object.keys(event.mentions)[0];
			}
			// reply
			else if (event.messageReply) {
				uid = event.messageReply.senderID;
			}
			// self
			else {
				uid = event.senderID;
			}

			const userData = await usersData.get(uid);
			const name = userData?.name || "User";

			await buildImage(uid, name, message);

		} catch (e) {
			console.log("BODYCOUNT ERROR:", e);
			message.reply("❌ Failed to generate image.");
		}
	}
};

async function buildImage(uid, name, message) {
	const cacheDir = path.join(__dirname, "cache");
	await fs.ensureDir(cacheDir);

	const avatarPath = path.join(cacheDir, `${uid}_av.png`);
	const outputPath = path.join(cacheDir, `${uid}_bodycount.png`);

	// download avatar
	try {
		const url = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
		const res = await axios.get(url, { responseType: "arraybuffer" });
		fs.writeFileSync(avatarPath, Buffer.from(res.data));
	} catch (err) {
		throw new Error("Avatar download failed");
	}

	const canvas = createCanvas(700, 700);
	const ctx = canvas.getContext("2d");

	// background
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, 700, 700);

	const avatar = await loadImage(avatarPath);

	// avatar circle
	ctx.save();
	ctx.beginPath();
	ctx.arc(350, 500, 100, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(avatar, 250, 400, 200, 200);
	ctx.restore();

	const count = deterministicCount(uid);
	const seedBase = parseInt(uid.replace(/\D/g, "")) || uid.length;

	for (let i = 0; i < count; i++) {
		const seed = seedBase + i;
		const startX = seededRandom(seed) * 700;
		const ctrlX = (startX + 350) / 2;
		const ctrlY = seededRandom(seed + 999) * 300;

		ctx.beginPath();
		ctx.strokeStyle = "red";
		ctx.lineWidth = 2;
		ctx.moveTo(startX, 0);
		ctx.quadraticCurveTo(ctrlX, ctrlY, 350, 400);
		ctx.stroke();
	}

	ctx.fillStyle = "red";
	ctx.font = "bold 36px Arial";
	ctx.textAlign = "center";
	ctx.fillText(`Body Count: ${count}`, 350, 680);

	const buffer = canvas.toBuffer("image/png");
	fs.writeFileSync(outputPath, buffer);

	// cleanup
	fs.unlinkSync(avatarPath);

	return message.reply({
		body: `Here's the body count of ${name}`,
		attachment: fs.createReadStream(outputPath)
	});
}
