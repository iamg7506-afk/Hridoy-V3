const fs = require("fs-extra");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
	config: {
		name: "commandperformance",
		aliases: ["cmdperf"],
		version: "1.1",
		author: "HR ID OY",
		countDown: 5,
		role: 2,
		description: {
			en: "turn on/off command performance logging (logs/performance.log)"
		},
		category: "Admin",
		guide: {
			en: "   {pn} [on | off]: turn on/off command performance logging"
		}
	},

	langs: {
		en: {
			turnedOn: "Turned on command performance logging",
			turnedOff: "Turned off command performance logging"
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

		config.commandPerformance = config.commandPerformance || {};
		config.commandPerformance.enable = value;
		message.reply(getLang(value ? "turnedOn" : "turnedOff"));

		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
	}
};
