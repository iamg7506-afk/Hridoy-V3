const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const path = require("path");
const exec = (cmd, options) => new Promise((resolve, reject) => {
	require("child_process").exec(cmd, options, (err, stdout) => {
		if (err) return reject(err);
		resolve(stdout);
	});
});
const { log, loading, getText, colors, removeHomeDir } = global.utils;
const { GoatBot } = global;
const { configCommands } = GoatBot;
const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
const packageAlready = [];
// v3: Node built-ins (path, fs, os, util, ...) must never be passed to "npm install"
const nodeBuiltins = new Set(require("module").builtinModules.flatMap(m => [m, "node:" + m]));
function isResolvable(name) {
	try { require.resolve(name, { paths: [process.cwd()] }); return true; }
	catch (e) { return existsSync(`${process.cwd()}/node_modules/${name}`); }
}

const hackerLog = () => {
	console.log("[+] Loading commands...");
	console.log("[+] Loading events...");
	console.log("[✓] All modules loaded successfully.");
	console.log("> System ready...");
};

module.exports = async function (api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine) {

	hackerLog(); // simple hacker-style output

	const aliasesData = await globalData.get('setalias', 'data', []);
	if (aliasesData) {
		for (const data of aliasesData) {
			const { aliases, commandName } = data;
			for (const alias of aliases)
				if (GoatBot.aliases.has(alias))
					throw new Error(`Alias "${alias}" already exists in command "${commandName}"`);
				else
					GoatBot.aliases.set(alias, commandName);
		}
	}

	const folders = ["cmds", "events"];
	let text, setMap, typeEnvCommand;

	for (const folderModules of folders) {
		if (folderModules == "cmds") {
			text = "command";
			typeEnvCommand = "envCommands";
			setMap = "commands";
		}
		else {
			text = "event command";
			typeEnvCommand = "envEvents";
			setMap = "eventCommands";
		}

		const fullPathModules = path.normalize(process.cwd() + `/scripts/${folderModules}`);
		const Files = readdirSync(fullPathModules)
			.filter(file =>
				file.endsWith(".js") &&
				!file.endsWith("eg.js") &&
				(process.env.NODE_ENV == "development" ? true : !file.match(/(dev)\.js$/g)) &&
				!configCommands[folderModules == "cmds" ? "commandUnload" : "commandEventUnload"]?.includes(file)
			);

		const commandError = [];
		let commandLoadSuccess = 0;

		for (const file of Files) {
			const pathCommand = path.normalize(fullPathModules + "/" + file);

			try {
				const contentFile = readFileSync(pathCommand, "utf8");
				let allPackage = contentFile.match(regExpCheckPackage);

				if (allPackage) {
					allPackage = allPackage.map(p => p.match(/[`'"]([^`'"]+)[`'"]/)[1])
						.filter(p => p.indexOf("/") !== 0 && p.indexOf("./") !== 0 && p.indexOf("../") !== 0 && p.indexOf(__dirname) !== 0);

					for (let packageName of allPackage) {
						if (packageName.startsWith('@'))
							packageName = packageName.split('/').slice(0, 2).join('/');
						else packageName = packageName.split('/')[0];

						if (!packageAlready.includes(packageName) && !nodeBuiltins.has(packageName)) {
							packageAlready.push(packageName);

							if (!isResolvable(packageName)) {
								console.log(`[+] Installing package: ${packageName}`);
								try {
									await exec(`npm install --no-audit --no-fund ${packageName}`, { timeout: 60000 });
									console.log(`[✓] Installed: ${packageName}`);
								}
								catch {
									console.log(`[✖] Failed installing ${packageName}`);
									throw new Error(`Can't install package ${packageName}`);
								}
							}
						}
					}
				}

				global.temp.contentScripts[folderModules][file] = contentFile;

				// A command whose top-level code calls process.exit() must not be able to kill the bot at load time.
				const _realExit = process.exit;
				process.exit = code => { throw new Error(`${file} called process.exit(${code}) while loading - blocked`); };
				let command;
				try { command = require(pathCommand); }
				finally { process.exit = _realExit; }
				command.location = pathCommand;

				const configCommand = command.config;
				if (!configCommand)
					throw new Error(`config of ${text} undefined`);
				const commandName = configCommand.name;
				if (!configCommand.category)
					throw new Error(`category of ${text} undefined`);
				if (!commandName)
					throw new Error(`name of ${text} undefined`);
				if (!command.onStart)
					throw new Error(`onStart of ${text} undefined`);

				const { onFirstChat, onChat, onLoad, onEvent, onAnyEvent } = command;
				const { envGlobal, envConfig } = configCommand;
				const { aliases } = configCommand;

				const validAliases = [];
				if (aliases) {
					if (!Array.isArray(aliases))
						throw new Error("The value of \"config.aliases\" must be array!");

					for (const alias of aliases) {
						if (aliases.filter(item => item == alias).length > 1)
							throw new Error(`alias "${alias}" duplicate in ${text} "${commandName}"`);

						if (GoatBot.aliases.has(alias))
							throw new Error(`alias "${alias}" already exists in another command`);

						validAliases.push(alias);
					}

					for (const alias of validAliases)
						GoatBot.aliases.set(alias, commandName);
				}

				if (onLoad) {
					// One stuck onLoad (network call, endless wait) must not keep the whole bot from starting.
					const loading = Promise.resolve(onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData }));
					loading.catch(() => {});
					let timer;
					const timedOut = await Promise.race([
						loading.then(() => false),
						new Promise(r => { timer = setTimeout(() => r(true), 20000); })
					]);
					clearTimeout(timer);
					if (timedOut) console.log(`[!] ${file}: onLoad still running after 20s - continuing startup without waiting for it`);
				}

				if (onChat) GoatBot.onChat.push(commandName);
				if (onFirstChat) GoatBot.onFirstChat.push({ commandName, threadIDsChattedFirstTime: [] });
				if (onEvent) GoatBot.onEvent.push(commandName);
				if (onAnyEvent) GoatBot.onAnyEvent.push(commandName);

				GoatBot[setMap].set(commandName.toLowerCase(), command);
				commandLoadSuccess++;

			} catch (error) {
				commandError.push({ name: file, error });
			}
		}

		if (commandError.length > 0) {
			log.err("LOADED", `Error loading some ${text}s`);
			for (const item of commandError)
				console.log(` ✖ ${item.name}: ${item.error.message}`);
		}
	}

	// toru-pro: reminders, auto backup, hot reload, Telegram/Discord bridge
	try { require("../../utils/services.js").start({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData }); }
	catch (e) { console.log("[SERVICES]", e.message); }
};
