/**
 * accountswitch — manually swap between account.txt (primary) and
 * account2.txt (secondary), then restart so the bot logs back in with
 * whichever cookies are now in account.txt.
 *
 * Reuses the exact same swap logic Two-ID Mode already uses for its
 * automatic failover (bot/login/twoIdMode.js), so a manual switch and
 * an automatic switch can never disagree about which account is
 * "active" or leave twoIdModeState.json out of sync.
 */

const twoIdModeHelper = require(process.cwd() + "/bot/login/twoIdMode.js");

module.exports = {
  config: {
    name: "accountswitch",
    aliases: ["switchaccount", "swacc"],
    version: "1.0.1",
    author: "HR ID OY",
    role: 2, // bot admin only
    countDown: 5,
    shortDescription: "Switch between primary/secondary FB account",
    longDescription:
      "Manually swap account.txt with account2.txt and restart the bot so it logs in with the other account. Works whether or not Two-ID Mode's automatic failover is enabled.",
    category: "System",
    guide: "{prefix}accountswitch",
  },

  onStart: async function ({ message }) {
    const config = global.GoatBot.config;
    const twoIdMode = config.twoIdMode || {};
    const secondaryPath = twoIdMode.secondaryAccountPath || "account2.txt";

    const state = twoIdModeHelper.readState();
    const currentlyActive = state.activeAccount || "primary";

    const swapped = twoIdModeHelper.trySwapAccountFiles(secondaryPath);
    if (!swapped) {
      return message.reply(
        `𝗫 Couldn't switch accounts — make sure "${secondaryPath}" exists in the bot's root folder ` +
        `and actually contains the second account's cookies (not just the placeholder text).`
      );
    }

    const newActive = currentlyActive === "primary" ? "secondary" : "primary";
    const newState = {
      ...state,
      activeAccount: newActive,
      failCount: 0,
      lastSwitchAt: Date.now(),
    };
    twoIdModeHelper.writeState(newState);

    await message.reply(
      `✦ Switched from ${currentlyActive} → ${newActive} account.\n🔄 Restarting now...`
    );

    // exit code 2 = "planned restart", index.js's supervisor restarts
    // immediately instead of treating this like a crash/backoff.
    process.exit(2);
  },
};
