const path = require('path');
const prettier = require('prettier');
const fs = require('fs');
const chokidar = require('chokidar');
const paths = require('../paths');

const PRETTIER_CONFIG_FILES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  '.prettierrc.js',
  'package.json',
  'prettier.config.js',
  '.editorconfig',
].map(f => paths.map(f));

const DEFAULT_PRETTIER_OPTIONS = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  cursorOffset: 0,
  insertFinalNewline: true,
  editorconfig: true,
};

let watcher;
function startWatch() {
  if (!global.__REKIT_NO_WATCH) {
    watcher = chokidar.watch(PRETTIER_CONFIG_FILES, {
      persistent: true,
      awaitWriteFinish: true,
    });

    const clearConfigCache = () => prettier.clearConfigCache();
    watcher.on('all', clearConfigCache);
  }
}

function format(code, file, opts = {}) {
  if (!watcher) startWatch();
  const filePath = path.isAbsolute(file) ? file : paths.map(file);
  if (!code) code = fs.readFileSync(filePath).toString();

  let formatted = code;
  try {
    const options = prettier.resolveConfig.sync(filePath) || {};
    const finalOptions = Object.assign(
      { filepath: filePath },
      DEFAULT_PRETTIER_OPTIONS,
      options,
      opts,
    );
    if (!finalOptions.insertFinalNewline) {
      finalOptions.rangeStart = 0;
      finalOptions.rangeEnd = code.length - 1;
    }
    formatted = prettier.formatWithCursor(code, finalOptions);
  } catch (err) {
    console.log('Failed to format code: ', err);
  }
  return formatted;
}

module.exports = format;
