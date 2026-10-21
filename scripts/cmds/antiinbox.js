const fs = require("fs-extra");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
	config: {
		name: "antiinbox",
		aliases: ["antiinb"],
		version: "1.2",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		description: {
			en: "turn on/off anti inbox mode (bot ignores inbox/DM messages)"
		},
		category: "Admin",
		guide: {
			en: "   {pn} [on | off]: turn on/off anti inbox mode"
		}
	},

	langs: {
		en: {
			turnedOn: "Turned on anti inbox mode",
			turnedOff: "Turned off anti inbox mode"
		}
	},

	onStart: function ({ args, message, getLang }) {
		let value;

		if (args[0] == "on")
			value = true;
		else if (args[0] == "off")
			value = false;
		else
			return message.SyntaxError();

		config.antiInbox = value;
		message.reply(getLang(value ? "turnedOn" : "turnedOff"));

		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
	}
};
