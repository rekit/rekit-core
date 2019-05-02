'use strict';

// Summary:
//  Load plugins

// Set the node_modules of Rekit Studio as the NODE_PATH to find modules.
// So that plugin could use dependencies of Rekit Studio and Rekit Core.
const utils = require('./utils');
const nodeModulesPath = require.resolve('lodash').replace('/lodash/lodash.js', '');
utils.addNodePath(nodeModulesPath);
try {
  // If rekit studio is installed globally, add rekit-studio's deps to NODE_PATH
  const rsPath = require.resolve('rekit-studio/package.json').replace(/[/\\]package\.json$/, '');
  utils.addNodePath(rsPath + '/node_modules');
  utils.addNodePath(rsPath.replace(/[/\\]rekit-studio$/, ''));
} catch (err) {
  // Do nothing if not found rekit studio
}

const fs = require('fs-extra');
const path = require('path');
const spawn = require('child_process').spawn;
const _ = require('lodash');
const os = require('os');
const paths = require('./paths');
const config = require('./config');
const logger = require('./logger');
const downloadNpmPackage = require('download-npm-package');

let appliedPlugins = undefined;
let allPlugins = [];
let loaded = false;
let needFilterPlugin = true;

const DEFAULT_PLUGIN_DIR = path.join(os.homedir(), '.rekit/plugins');

const pluginsDirs = [DEFAULT_PLUGIN_DIR];
function addPluginsDir(dir) {
  pluginsDirs.push(dir);
}
function getPluginsDir() {
  return DEFAULT_PLUGIN_DIR;
}

function getPlugins(prop) {
  if (!loaded) {
    if (fs.existsSync(DEFAULT_PLUGIN_DIR)) loadPlugins(DEFAULT_PLUGIN_DIR);
    loaded = true;
  }

  filterPluginsIfNecessary();
  appliedPlugins.forEach(p => {
    if (p.initialize && !p.__initialized) {
      p.initialize();
      p.__initialized = true;
    }
  });
  return prop ? appliedPlugins.filter(_.property(prop)) : appliedPlugins;
}

function filterPluginsIfNecessary() {
  initPluginsIfNecessary();
  if (!needFilterPlugin) return;
  const rekitConfig = config.getRekitConfig();

  // A plugin could decide if it's fit for the current project by feature files
  // appliedPlugins = allPlugins.filter(checkFeatureFiles);
  logger.info('All plugins:', allPlugins.map(p => p.name));
  const appType = rekitConfig.appType;
  appliedPlugins = allPlugins.filter(
    p =>
      (!p.shouldUse || p.shouldUse(paths.getProjectRoot())) &&
      (!p.appType || _.castArray(p.appType).includes(appType)),
  );
  logger.info('Applied plugins for appType ' + appType + ': ', appliedPlugins.map(p => p.name));

  needFilterPlugin = false;
}

function initPluginsIfNecessary() {
  allPlugins = allPlugins.map(plugin => {
    if (!plugin.inherit) return plugin;
    const newPlugin = { uiInherit: [] };
    _.castArray(plugin.inherit).forEach(name => {
      // currently only one level inherit supported?
      const p = getPlugin(name);
      if (!p) {
        throw new Error('INHERIT_PLUGIN_NOT_FOUND: ' + name + ' inherited by ' + plugin.name);
      }
      newPlugin.uiInherit.push(name);
      _.merge(newPlugin, p);
    });
    _.merge(newPlugin, plugin);
    newPlugin.__originalInherit = plugin.inherit;
    delete newPlugin.inherit; // only inherit once
    return newPlugin;
  });
}

function getPlugin(name) {
  return _.find(allPlugins, { name }) || null;
}

// Load plugin instance, plugin depends on project config
function loadPlugin(pluginRoot, noUI) {
  // noUI flag is used for loading dev plugins whose ui is from webpack dev server
  try {
    // const pkgJson = require(paths.join(pluginRoot, 'package.json'));
    const pluginInstance = {};
    // Core part
    const coreIndex = paths.join(pluginRoot, 'core/index.js');
    if (fs.existsSync(coreIndex)) {
      Object.assign(pluginInstance, require(coreIndex));
    }

    // UI part
    if (!noUI && fs.existsSync(path.join(pluginRoot, 'build/main.js'))) {
      pluginInstance.ui = {
        root: path.join(pluginRoot, 'build'),
      };
    }

    // Plugin meta defined in package.json
    const pkgJsonPath = path.join(pluginRoot, 'package.json');
    let pkgJson = null;
    if (fs.existsSync(pkgJsonPath)) {
      pkgJson = fs.readJsonSync(pkgJsonPath);
      ['appType', 'name', 'featureFiles'].forEach(key => {
        if (!pluginInstance.hasOwnProperty(key) && pkgJson.hasOwnProperty(key)) {
          if (key === 'name') {
            let name = pkgJson.name;
            if (name.startsWith('rekit-plugin')) name = name.replace('rekit-plugin-', '');
            pluginInstance.name = name;
          } else {
            pluginInstance[key] = pkgJson[key] || null;
          }
        }
      });
      if (pkgJson.rekitPlugin) {
        Object.keys(pkgJson.rekitPlugin).forEach(key => {
          if (!pluginInstance.hasOwnProperty(key)) {
            pluginInstance[key] = pkgJson.rekitPlugin[key];
          }
        });
      }
    }
    return pluginInstance;
  } catch (e) {
    logger.warn(`Failed to load plugin: ${pluginRoot}`, e);
  }

  return null;
}

function loadPlugins(dir) {
  // At dev time, do not load dist plugins from dir.
  // Because Rekit Studio doesn't support it at dev time.
  if (process.env.NODE_ENV === 'development') return;
  fs.readdirSync(dir)
    .map(d => path.join(dir, d))
    .filter(d => fs.statSync(d).isDirectory())
    .forEach(d => addPluginByPath(d));
}

// Dynamically add an plugin
function addPlugin(plugin) {
  if (!plugin) {
    return;
  }
  if (!needFilterPlugin) {
    console.warn('You are adding a plugin after getPlugins is called.');
  }
  needFilterPlugin = true;
  if (!plugin.name) {
    console.log('plugin: ', plugin);
    throw new Error('Each plugin should have a name.');
  }
  if (_.find(allPlugins, { name: plugin.name })) {
    console.warn('You should not add a plugin with same name: ' + plugin.name);
    return;
  }
  allPlugins.push(plugin);
}

function addPluginByPath(pluginRoot, noUI) {
  addPlugin(loadPlugin(pluginRoot, noUI));
}

function removePlugin(pluginName) {
  const removed = _.remove(allPlugins, { name: pluginName });
  needFilterPlugin = true;
  if (!removed.length) console.warn('No plugin was removed: ' + pluginName);
}


function listInstalledPlugins() {
  // Only get plugins from standard rekit plugin folder
  const dir = paths.configFile('plugins2');
  const plugins = [];

  if (fs.existsSync(dir))
    fs.readdirSync(dir)
      .filter(name => /^rekit-plugin-/.test(name))
      .map(name => path.join(dir, name))
      .filter(d => fs.statSync(d).isDirectory())
      .forEach(pluginRoot => {
        try {
          const pkgJson = require(paths.join(pluginRoot, 'package.json'));
          // Plugin info
          const pluginInfo = {};
          Object.assign(pluginInfo, pkgJson);

          plugins.push(pluginInfo);
        } catch (err) {
          console.log('Failed to load plugin info: ', pluginRoot);
        }
      });

  return plugins;
}
function installPlugin(name) {
  if (!/^rekit-plugin-/.test(name)) {
    name = 'rekit-plugin-' + name;
  }
  logger.info('Installing plugin: ', name);
  const destDir = paths.configFile('plugins/' + name);
  if (fs.existsSync(destDir)) {
    logger.info('Plugin already installed, reinstalling it...');
    fs.removeSync(destDir);
  }
  downloadNpmPackage({ arg: name, dir: paths.configFile('plugins') })
    .then(() => {
      const pkgJson = require(path.join(destDir, 'package.json'));
      if (!_.isEmpty(pkgJson.dependencies)) {
        console.log('Plugin downloaded, installing its dependencies...');
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const child = spawn(npmCmd, ['install', '--colors', '--only=production'], {
          stdio: 'inherit',
          cwd: destDir,
        });
        let failed = false;
        child.on('exit', () => {
          if (!failed) logger.info('Plugin installed successfully.');
        });
        child.on('error', err => {
          failed = true;
          logger.error('Failed to install deps of the plugin. Remove plugin.', err);
          fs.removeSync(destDir);
        });
      }
    })
    .catch(err => {
      logger.error('Failed to download plugin.', err);
    });
}

function uninstallPlugin(name) {
  if (!/^rekit-plugin-/.test(name)) {
    name = 'rekit-plugin-' + name;
  }
  logger.info('Uninstalling plugin: ', name);
  const destDir = paths.configFile('plugins/' + name);
  if (fs.existsSync(destDir)) {
    fs.removeSync(destDir);
    logger.info('Done.');
  } else {
    logger.info('Plugin not exist: ' + name);
  }
}

module.exports = {
  getPlugins,
  getPlugin,
  loadPlugins,
  addPlugin,
  addPluginByPath,
  removePlugin,
  getPluginsDir,
  addPluginsDir,
  installPlugin,
  uninstallPlugin,
  listInstalledPlugins,
};
