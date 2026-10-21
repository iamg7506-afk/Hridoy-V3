const fs = require("fs-extra");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
	config: {
		name: "noprefix",
		aliases: ["nopfx"],
		version: "1.1",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		description: {
			en: "turn on/off no-prefix mode (bot admins can use commands without prefix)"
		},
		category: "Admin",
		guide: {
			en: "   {pn} [on | off]: turn on/off no-prefix mode"
		}
	},

	langs: {
		en: {
			turnedOn: "Turned on no-prefix mode",
			turnedOff: "Turned off no-prefix mode"
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

		config.noPrefix = config.noPrefix || {};
		config.noPrefix.enable = value;
		message.reply(getLang(value ? "turnedOn" : "turnedOff"));

		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
	}
};
