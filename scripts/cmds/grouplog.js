const fs = require("fs-extra");
const path = require("path");

// এই ফাইলে প্রতিটি গ্রুপের জন্য গ্রুপলগ চালু/বন্ধ আছে কিনা তা সেভ থাকে
const grouplogPath = path.join(process.cwd(), "database", "data", "grouplog.json");

if (!fs.existsSync(path.dirname(grouplogPath))) {
	fs.mkdirSync(path.dirname(grouplogPath), { recursive: true });
}
if (!fs.existsSync(grouplogPath)) {
	fs.writeJsonSync(grouplogPath, {}, { spaces: 2 });
}

function readData() {
	try {
		return fs.readJsonSync(grouplogPath);
	}
	catch (e) {
		return {};
	}
}

function writeData(data) {
	fs.writeJsonSync(grouplogPath, data, { spaces: 2 });
}

module.exports.config = {
	name: "grouplog",
	aliases: ["glog"],
	version: "1.1",
	author: "HR ID OY",
	role: 1, // শুধু গ্রুপ এডমিন/বট এডমিন চালাতে পারবে
	countDown: 5,
	category: "Group",
	shortDescription: {
		en: "Turn on/off group activity logger",
		vi: "Bật/tắt nhật ký hoạt động nhóm"
	},
	longDescription: {
		en: "Logs every group event (nickname change, group name/image change, calls, member add/remove, admin update, theme change) into the group as a styled message.",
		vi: "Ghi lại mọi hoạt động của nhóm (đổi biệt danh, đổi tên/ảnh nhóm, cuộc gọi, thêm/xóa thành viên, cập nhật quản trị viên, đổi giao diện) và gửi vào nhóm."
	},
	guide: {
		en: "{pn} on: turn on group log"
			+ "\n{pn} off: turn off group log"
			+ "\n{pn} status: check current group log status",
		vi: "{pn} on: bật nhật ký nhóm"
			+ "\n{pn} off: tắt nhật ký nhóm"
			+ "\n{pn} status: xem trạng thái nhật ký nhóm hiện tại"
	}
};

module.exports.onStart = async function ({ args, message, event, getLang }) {
	const { threadID } = event;
	const data = readData();
	const sub = (args[0] || "").toLowerCase();

	switch (sub) {
		case "on": {
			data[threadID] = { on: true };
			writeData(data);
			return message.reply(
				"╭───────────────╮\n"
				+ "   📋 𝗚𝗥𝗢𝗨𝗣 𝗟𝗢𝗚\n"
				+ "╰───────────────╯\n"
				+ "✅ Group log has been turned ON\n"
				+ "📌 All group activities will now be tracked here."
			);
		}

		case "off": {
			data[threadID] = { on: false };
			writeData(data);
			return message.reply(
				"╭───────────────╮\n"
				+ "   📋 𝗚𝗥𝗢𝗨𝗣 𝗟𝗢𝗚\n"
				+ "╰───────────────╯\n"
				+ "❌ Group log has been turned OFF\n"
				+ "📌 Group activities will no longer be tracked."
			);
		}

		case "status": {
			const isOn = !!(data[threadID] && data[threadID].on);
			return message.reply(
				"╭───────────────╮\n"
				+ "   📋 𝗚𝗥𝗢𝗨𝗣 𝗟𝗢𝗚 𝗦𝗧𝗔𝗧𝗨𝗦\n"
				+ "╰───────────────╯\n"
				+ `${isOn ? "🟢 Currently: ON" : "🔴 Currently: OFF"}\n`
				+ "📌 Use \"grouplog on\" or \"grouplog off\" to change."
			);
		}

		default: {
			return message.reply(
				"╭───────────────╮\n"
				+ "   📋 𝗚𝗥𝗢𝗨𝗣 𝗟𝗢𝗚 — 𝗛𝗘𝗟𝗣\n"
				+ "╰───────────────╯\n"
				+ "!grouplog on → Turn on group log\n"
				+ "!grouplog off → Turn off group log\n"
				+ "!grouplog status → Check current status\n\n"
				+ "𝗧𝗿𝗮𝗰𝗸𝗲𝗱 𝗲𝘃𝗲𝗻𝘁𝘀:\n"
				+ "🏷️ Nickname change\n"
				+ "📝 Group name change\n"
				+ "🖼️ Group image change\n"
				+ "📞 Call started\n"
				+ "📲 Call joined\n"
				+ "📴 Call ended\n"
				+ "➕ Member added\n"
				+ "➖ Member removed\n"
				+ "🛡️ Admin update\n"
				+ "🎨 Theme/appearance update"
			);
		}
	}
};

// অন্য ফাইল (event handler) থেকে থ্রেডের গ্রুপলগ স্ট্যাটাস চেক করার জন্য এক্সপোর্ট করা হলো
module.exports.isGrouplogOn = function (threadID) {
	const data = readData();
	return !!(data[threadID] && data[threadID].on);
};
				
