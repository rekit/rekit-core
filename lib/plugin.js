const fs = require('fs-extra');
const plugin = require('js-plugin');
const paths = require('./paths');

plugin.config.throws = true;

const pluginsRoots = [];
// Load plugins
const defaultPluginsDir = paths.configPath('plugins');
console.log(defaultPluginsDir);
fs.readdirSync(defaultPluginsDir).forEach(file => {
  const absFile = path.join(defaultPluginsDir, file);
  const stat = fs.statSync(absFile);
  if (!stat.isDirectory()) return;
  console.log(file);
});

module.exports = plugin;
