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
    // load built-in plugins
    fs.readdirSync(path.join(__dirname, '../plugins')).forEach(d => {
      d = path.join(__dirname, '../plugins', d);
      if (fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, 'index.js'))) {
        const p = require(d);
        p.root = d;
        addPlugin(p);
      }
    });
    if (fs.existsSync(DEFAULT_PLUGIN_DIR)) loadPlugins(DEFAULT_PLUGIN_DIR);
    // Load plugin from environment variable: REKIT_PLUGIN_DIR , used in plugin dev time
    // This doesn't load UI part, only for cli testing purpose
    if (process.env.REKIT_PLUGIN_DIR) {
      const d = process.env.REKIT_PLUGIN_DIR;
      if (!path.isAbsolute(d))
        throw new Error(`REKIT_PLUGIN_DIR should be absolute path, got: ${d}`);
      addPluginByPath(d, true);
    }
    sortPlugins();
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

function sortPlugins() {
  // Sort plugins according dep relations and Rekit config.
  const rekitConfig = config.getRekitConfig();
  const pluginOrder = rekitConfig.pluginOrder || [];

  allPlugins.sort((p1, p2) => {
    const p1Index = pluginOrder.indexOf(p1.name);
    const p2Index = pluginOrder.indexOf(p2.name);
    if (p1.dependencies && p1.dependencies.includes(p2.name)) {
      // If p1 depends on p2, load p2 first
      return 1;
    }
    if (p2.dependencies && p2.dependencies.includes(p1.name)) {
      // If p2 depends on p1, load p1 first
      return -1;
    }
    if (p1Index >= 0 && p2Index === -1) {
      // If only p1 configed, load it first
      return -1;
    }
    if (p2Index >= 0 && p1Index === -1) {
      // If only p2 configed, load it first
      return 1;
    }
    if (p1Index >= 0 && p2Index >= 0) {
      // If both configed, load before first
      return p1Index - p2Index;
    }
    // No order specified.
    return 0;
  });
}

function filterPluginsIfNecessary() {
  initPluginsIfNecessary();
  if (!needFilterPlugin) return;
  const rekitConfig = config.getRekitConfig();

  // A plugin could decide if it's fit for the current project by feature files
  logger.info('All plugins:', allPlugins.map(p => p.name));
  const appType = rekitConfig.appType;
  appliedPlugins = allPlugins.filter(
    p =>
      (!p.shouldUse || p.shouldUse(paths.getProjectRoot())) &&
      (!p.appType || _.castArray(p.appType).includes(appType)) &&
      !(rekitConfig.excludePlugins || []).map(s => s.replace('rekit-plugin', '')).includes(p.name),
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
    const pluginInstance = { root: pluginRoot };
    // Core part
    const coreIndex = paths.join(pluginRoot, 'core/index.js');
    if (fs.existsSync(coreIndex)) {
      Object.assign(pluginInstance, require(coreIndex));
    }

    // if (fs.existsSync(path.join(pluginRoot, 'logo.png'))) {
    //   pluginInstance.logo = path.join(pluginRoot, 'logo.png');
    // }

    // UI part
    if (!noUI) {
      let entry = 'main.js';
      if (
        process.env.NODE_ENV === 'development' &&
        fs.existsSync(path.join(pluginRoot, 'build', 'main-dev.js'))
      ) {
        entry = 'main-dev.js';
      }
      if (fs.existsSync(path.join(pluginRoot, 'build', entry))) {
        pluginInstance.ui = {
          root: path.join(pluginRoot, 'build'),
          entry,
        };
      }
    }

    // Plugin meta defined in package.json
    const pkgJsonPath = path.join(pluginRoot, 'package.json');
    let pkgJson = null;
    if (fs.existsSync(pkgJsonPath)) {
      pkgJson = fs.readJsonSync(pkgJsonPath);

      ['appType', 'name', 'version', 'description', 'author', 'homepage', 'repository'].forEach(
        key => {
          if (!pluginInstance.hasOwnProperty(key) && pkgJson.hasOwnProperty(key)) {
            if (key === 'name') {
              let name = pkgJson.name;
              if (name.startsWith('rekit-plugin')) name = name.replace('rekit-plugin-', '');
              pluginInstance.name = name;
            } else {
              pluginInstance[key] = pkgJson[key] || null;
            }
          }
        },
      );
      if (pkgJson.rekitPlugin) {
        Object.keys(pkgJson.rekitPlugin).forEach(key => {
          if (!pluginInstance.hasOwnProperty(key)) {
            pluginInstance[key] = pkgJson.rekitPlugin[key];
          }
        });
      }
    }
    if (!pluginInstance.version) pluginInstance.version = '0.0.1';
    return pluginInstance;
  } catch (e) {
    logger.warn(`Failed to load plugin: ${pluginRoot}`, e);
  }

  return null;
}

function loadPlugins(dir) {
  // At rekit studio dev time, do not load dist plugins from dir.
  // Because Rekit Studio doesn't support it at dev time.
  if (process.env.REKIT_STUDIO_DEVELOPMENT) return;
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
  if (!plugin.getModule) {
    plugin.getModule = mid => {
      try {
        return require(path.join(plugin.root, mid));
      } catch (err) {
        logger.debug('Faied to load module: ' + mid, err);
        return null;
      }
    };
  }
  needFilterPlugin = true;
  if (!plugin.name) {
    logger.info('plugin: ', plugin);
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

function getInstalledPlugins() {
  // Only get plugins from standard rekit plugin folder
  const dir = paths.configFile('plugins');
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
          if (fs.existsSync(path.join(pluginRoot, 'logo.png'))) {
            pluginInfo.logo = path.join(pluginRoot, 'logo.png');
          }
          pluginInfo.name = pluginInfo.name.replace(/^rekit-plugin-/, '');
          plugins.push(pluginInfo);
        } catch (err) {
          console.log('Failed to load plugin info: ', pluginRoot);
        }
      });

  return plugins;
}

// const getInstalledPlugins = listInstalledPlugins;
// const getAllPlugins = getInstalledPlugins;

// // This is used to list all plugins for plugin manager
// function getAllPlugins() {

//     // load built-in plugins
//     fs.readdirSync(path.join(__dirname, '../plugins')).forEach(d => {
//       d = path.join(__dirname, '../plugins', d);
//       if (fs.statSync(d).isDirectory() && fs.existsSync(path.join(d, 'index.js'))) {
//         const p = require(d);
//         p.root = d;
//         addPlugin(p);
//       }
//     });
//     if (fs.existsSync(DEFAULT_PLUGIN_DIR)) loadPlugins(DEFAULT_PLUGIN_DIR);
//     // Load plugin from environment variable: REKIT_PLUGIN_DIR , used in plugin dev time
//     // This doesn't load UI part, only for cli testing purpose
//     if (process.env.REKIT_PLUGIN_DIR) {
//       const d = process.env.REKIT_PLUGIN_DIR;
//       if (!path.isAbsolute(d))
//         throw new Error(`REKIT_PLUGIN_DIR should be absolute path, got: ${d}`);
//       addPluginByPath(d, true);
//     }
//     sortPlugins();
//     loaded = true;

// }

function installPlugin(name) {
  return new Promise((resolve, reject) => {
    if (!/^rekit-plugin-/.test(name)) {
      name = 'rekit-plugin-' + name;
    }
    logger.info('Installing plugin: ' + name);
    const destDir = paths.configFile('plugins/' + name);
    if (fs.existsSync(destDir)) {
      logger.info('Plugin already installed, reinstalling it...');
      fs.removeSync(destDir);
    }
    downloadNpmPackage({ arg: name, dir: paths.configFile('plugins') })
      .then(() => {
        const pkgJson = require(path.join(destDir, 'package.json'));
        const installSuccess = () => {
          logger.info(`Plugin installed successfully: ${name}@${pkgJson.version}.`);
          if (fs.existsSync(path.join(destDir, 'logo.png'))) {
            pkgJson.logo = path.join(pkgJson, 'logo.png');
          }
          pkgJson.name = pkgJson.name.replace(/^rekit-plugin-/, '');
          resolve(pkgJson);
        };
        if (!_.isEmpty(pkgJson.dependencies)) {
          console.log('Plugin downloaded, installing its dependencies...');
          const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
          const child = spawn(npmCmd, ['install', '--colors', '--only=production'], {
            stdio: 'inherit',
            cwd: destDir,
          });
          let failed = false;
          child.on('exit', () => {
            if (!failed) {
              logger.info(`Plugin installed successfully: ${name}@${pkgJson.version}.`);
              installSuccess();
            }
          });
          child.on('error', err => {
            failed = true;
            logger.error('Failed to install deps of the plugin. Remove plugin.', err);
            fs.removeSync(destDir);
            reject(err);
          });
        } else {
          installSuccess();
        }
      })
      .catch(err => {
        logger.error('Failed to download plugin.', err);
        reject(err);
      });
  });
}

function uninstallPlugin(name) {
  return new Promise(resolve => {
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
    resolve();
  });
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
  // listInstalledPlugins,
  getInstalledPlugins,
  // getAllPlugins,
};
