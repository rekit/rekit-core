"use strict";

const chalk = require("chalk");

let silent = false;

function setSilent(isSilent) {
  silent = isSilent;
}

function log(msg) {
  if (!silent) console.log(msg);
}

/**
 * Log a warning message to console. It respects the setSilent switch.
 * @param {string} msg - The message to log.
 **/
function warn(msg) {
  if (!silent) console.log(chalk.yellow("Warning: " + msg));
}

/**
 * Log an error message to console. It respects the setSilent switch.
 * @param {string} msg - The message to log.
 **/
function error(msg) {
  if (!silent) console.log(chalk.red("Error: " + msg));
}

module.exports = {
  setSilent,
  log,
  warn,
  error
};
