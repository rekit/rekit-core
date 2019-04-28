const fs = require('fs-extra');
const path = require('path');
const paths = require('./paths');
const chokidar = require('chokidar');
const EventEmitter = require('events');
const _ = require('lodash');
const logger = require('./logger');

const config = new EventEmitter();

const debouncedEmit = _.debounce(evt => {
  config.emit(evt);
}, 50);

let appRegistry = 'rekit/app-registry';
let pluginRegistry = 'rekit/plugin-registry';
if (fs.existsSync(paths.configFile('config.json'))) {
  try {
    const rekitConfig = require(paths.configFile('config.json'));
    appRegistry = rekitConfig.appRegistry;
    pluginRegistry = rekitConfig.pluginRegistry;
  } catch (err) {
    // Do nothing if config.json broken
    logger.warn('Failed to load config.json, maybe there is some syntax error.');
  }
}

let pkgJson = null;
let pkgJsonWatcher = null;
function getPkgJson(noCache, prjRoot) {
  const pkgJsonPath = prjRoot ? paths.join(prjRoot, 'package.json') : paths.map('package.json');
  if (!fs.existsSync(pkgJsonPath)) return null;
  const refreshPkgJson = () => {
    try {
      pkgJson = fs.readJsonSync(pkgJsonPath);
    } catch (err) {
      logger.warn('Failed to load package.json, maybe there is some syntax error.', err);
      pkgJson = null;
    }
  };
  if (noCache || !pkgJson) {
    refreshPkgJson();
  }

  if (!pkgJsonWatcher && !global.__REKIT_NO_WATCH) {
    pkgJsonWatcher = chokidar.watch([pkgJsonPath], { persistent: true });
    pkgJsonWatcher.on('all', () => {
      refreshPkgJson();
      debouncedEmit('change');
    });
  }

  return pkgJson;
}

let rekitConfig = null;
let rekitConfigWatcher = null;
function getRekitConfig(noCache, prjRoot) {
  const rekitConfigFile = prjRoot ? paths.join(prjRoot, 'rekit.json') : paths.map('rekit.json');

  const refreshRekitConfig = () => {
    try {
      rekitConfig = fs.readJsonSync(rekitConfigFile);
    } catch (e) {
      // Do nothing if rekit config is broken. Will use the last available one
      logger.warn('Failed to load rekit.json, maybe there is some syntax error.');
    }
  };
  if (!rekitConfigWatcher && !global.__REKIT_NO_WATCH) {
    rekitConfigWatcher = chokidar.watch([rekitConfigFile], { persistent: true });
    rekitConfigWatcher.on('all', () => {
      refreshRekitConfig();
      debouncedEmit('change');
    });
  }

  if (!rekitConfig) {
    refreshRekitConfig();
  }

  if (!rekitConfig) {
    // config broken or not exist
    if (fs.existsSync(rekitConfigFile)) {
      // when rekit starts but config file is invalid, throw error.
      throw new Error('Config file broken: failed to parse rekit.json');
    } else {
      // Support rekit 2.x project.
      const pkgJson = getPkgJson();
      if (pkgJson && pkgJson.rekit) {
        rekitConfig = {
          appType: 'rekit-react',
          devPort: pkgJson.rekit.devPort,
          css: pkgJson.rekit.css || 'less',
        };
      } else {
        // normal project
        rekitConfig = {
          appType: 'common',
        };
      }
    }
  }
  return rekitConfig;
}

function getAppName() {
  const pkgJson = getPkgJson();
  return pkgJson ? pkgJson.name : path.basename(paths.getProjectRoot());
}

// function setAppType(_appType) {
//   if (rekitConfig) rekitConfig.appType = _appType;
//   appType = _appType;
// }

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
  getAppName,
  getPkgJson,
  getRekitConfig,
  setAppRegistry,
  setPluginRegistry,
  getAppRegistry,
  getPluginRegistry,
});

module.exports = config;
