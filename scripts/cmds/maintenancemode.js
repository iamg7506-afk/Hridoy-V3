const fs = require("fs-extra");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
	config: {
		name: "maintenancemode",
		aliases: ["maintenance"],
		version: "1.1",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		description: {
			en: "turn on/off maintenance mode"
		},
		category: "Admin",
		guide: {
			en: "   {pn} [on | off]: turn on/off maintenance mode"
		}
	},

	langs: {
		en: {
			turnedOn: "Turned on maintenance mode",
			turnedOff: "Turned off maintenance mode"
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

		config.maintenanceMode = config.maintenanceMode || {};
		config.maintenanceMode.enable = value;
		message.reply(getLang(value ? "turnedOn" : "turnedOff"));

		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
	}
};
