const fs = require('fs-extra');
const path = require('path');
const paths = require('./paths');
const chokidar = require('chokidar');
const EventEmitter = require('events');

const config = new EventEmitter();

let appRegistry = 'rekit/app-registry';
let pluginRegistry = 'rekit/plugin-registry';
let appType;
if (fs.existsSync(paths.configFile('config.json'))) {
  try {
    const rekitConfig = require(paths.configFile('config.json'));
    appRegistry = rekitConfig.appRegistry;
    pluginRegistry = rekitConfig.pluginRegistry;
  } catch (err) {
    // Do nothing if config.json broken or not exists
  }
}
function getPkgJson(noCache, prjRoot) {
  const pkgJsonPath = prjRoot ? paths.join(prjRoot, 'package.json') : paths.map('package.json');
  if (!fs.existsSync(pkgJsonPath)) return null;
  if (noCache) delete require.cache[pkgJsonPath];
  return require(pkgJsonPath);
}

let rekitConfig = null;
let rekitConfigWatcher = null;
function getRekitConfig(noCache, prjRoot) {
  const rekitConfigFile = prjRoot ? paths.join(prjRoot, 'rekit.json') : paths.map('rekit.json');
  const pkgJsonPath = prjRoot ? paths.join(prjRoot, 'package.json') : paths.map('package.json');
  if (!rekitConfigWatcher && !global.__REKIT_NO_WATCH) {
    rekitConfigWatcher = chokidar.watch([rekitConfigFile, pkgJsonPath], { persistent: true });
    rekitConfigWatcher.on('all', () => {
      try {
        rekitConfig = fs.readJsonSync(rekitConfigFile);
        config.emit('change');
      }catch(e) {
        // Do nothing if rekit config is broken. Will use the last available one
      }
    });
  }

  if (rekitConfig) return rekitConfig;

  if (fs.existsSync(rekitConfigFile)) {
    try {
      rekitConfig = fs.readJsonSync(rekitConfigFile);
    } catch (err) {
      throw new Error('Config file broken: failed to parse rekit.json');
    }
  } else {
    const pkgJson = getPkgJson(true, prjRoot);
    rekitConfig = (pkgJson && pkgJson.rekit) || {};
  }

  const c = rekitConfig || {};
  c.appType = appType || c.appType;
  return c;
}

function getAppName() {
  const pkgJson = getPkgJson();
  return pkgJson ? pkgJson.name : path.basename(__dirname);
}

function setAppType(_appType) {
  if (rekitConfig) rekitConfig.appType = _appType;
  appType = _appType;
}

function setAppRegistry(reg) {
  appRegistry = reg;
}

function getAppRegistry() {
  return appRegistry;
}

function setPluginRegistry(reg) {
  pluginRegistry = reg;
}

function getPluginRegistry() {
  return pluginRegistry;
}

// Load rekit configuration from package.json
Object.assign(config, {
  css: 'less',
  style: 'less',
  getAppName,
  getPkgJson,
  getRekitConfig,
  setAppType,
  setAppRegistry,
  setPluginRegistry,
  getAppRegistry,
  getPluginRegistry,
});

module.exports = config;
