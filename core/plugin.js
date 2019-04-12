'use strict';

// Summary:
//  Load plugins
const nodeModulesPath = require.resolve('lodash').replace('/lodash/lodash.js', '');
process.env.NODE_PATH = nodeModulesPath;
require('module').Module._initPaths();

const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const _ = require('lodash');
const os = require('os');
const paths = require('./paths');
const config = require('./config');
const downloadNpmPackage = require('download-npm-package');

let plugins = [];
let loaded = false;
let needFilterPlugin = true;

const DEFAULT_PLUGIN_DIR = path.join(os.homedir(), '.rekit/plugins');
const BUILT_IN_UI_PLUGINS = ['rekit-react-ui', 'default', 'test', 'terminal', 'scripts'];

const pluginsDirs = [DEFAULT_PLUGIN_DIR];
function addPluginsDir(dir) {
  pluginsDirs.push(dir);
}
function getPluginsDir() {
  return DEFAULT_PLUGIN_DIR;
}

function filterPlugins() {
  const rekitConfig = config.getRekitConfig();
  let appType = rekitConfig.appType;

  console.log('all plugins: ', appType, plugins.map(p => p.name));
  // If no appType configured, set it to the first matched plugin except common.
  // Pure folder plugin is always loaded.
  if (!appType) {
    plugins = plugins.filter(checkFeatureFiles); // Check folder structure if necessary
    const appPlugin = _.find(plugins, p => p.isAppPlugin && p.appType !== 'common');
    if (appPlugin) appType = _.castArray(appPlugin.appType)[0];
  }

  if (!appType) appType = 'common';
  config.setAppType(appType);
  plugins = plugins.filter(
    p => !p.appType || _.intersection(_.castArray(p.appType), _.castArray(appType)).length > 0,
  );
  console.log('applied plugins: ', plugins.map(p => p.name));
  needFilterPlugin = false;
}
function getPlugins(prop) {
  if (!loaded) {
    if (fs.existsSync(DEFAULT_PLUGIN_DIR)) loadPlugins(DEFAULT_PLUGIN_DIR);
    loaded = true;
  }
  plugins = plugins.map(plugin => {
    if (plugin.inherit) {
      const newPlugin = {};
      _.castArray(plugin.inherit).forEach(name => {
        const p = getPlugin(name);
        if (!p) {
          if (_.includes(BUILT_IN_UI_PLUGINS, name)) {
            if (!newPlugin.uiInherit) newPlugin.uiInherit = [];
            newPlugin.uiInherit.push(name);
          } else {
            throw new Error('INHERIT_PLUGIN_NOT_FOUND: ' + name + ' inherited by ' + plugin.name);
          }
        }
        _.merge(newPlugin, p);
      });
      _.merge(newPlugin, plugin);
      newPlugin.__originalInherit = plugin.inherit;
      delete newPlugin.inherit; // only inherit once
      return newPlugin;
    }
    return plugin;
  });

  if (needFilterPlugin) {
    filterPlugins();
  }

  return prop ? plugins.filter(_.property(prop)) : plugins;
}

function checkFeatureFiles(plugin) {
  // Detect if folder structure is for the plugin
  if (
    _.isArray(plugin.featureFiles) &&
    !plugin.featureFiles.every(f =>
      f.startsWith('!')
        ? !fs.existsSync(paths.map(f.replace('!', '')))
        : fs.existsSync(paths.map(f)),
    )
  ) {
    return false;
  }
  return true;
}

function getPlugin(name) {
  return _.find(plugins, { name }) || null;
}

// Load plugin instance, plugin depends on project config
function loadPlugin(pluginRoot, noUI) {
  // noUI flag is used for loading dev plugins whose ui is from webpack dev server
  try {
    const pkgJson = require(paths.join(pluginRoot, 'package.json'));
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

    // Plugin meta
    Object.assign(
      pluginInstance,
      pkgJson.rekitPlugin || _.pick(pkgJson, ['appType', 'name', 'isAppPlugin', 'featureFiles']),
    );
    let name = pkgJson.name;
    if (name.startsWith('rekit-plugin')) name = name.replace('rekit-plugin-', '');
    pluginInstance.name = name;
    if (pluginInstance.name.startsWith('rekit-plugin'))
      pluginInstance.name = pluginInstance.name.replace('rekit-plugin-', '');
    return pluginInstance;
  } catch (e) {
    console.warn(`Failed to load plugin: ${pluginRoot}, ${e}\n${e.stack}`);
  }

  return null;
}

function loadPlugins(dir) {
  fs.readdirSync(dir)
    .map(d => path.join(dir, d))
    .filter(d => fs.statSync(d).isDirectory())
    .forEach(addPluginByPath);
}

// Dynamically add an plugin
function addPlugin(plugin) {
  if (!plugin) {
    console.warn('adding none plugin, ignored: ', plugin);
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
  if (_.find(plugins, { name: plugin.name })) {
    console.warn('You should not add a plugin with same name: ' + plugin.name);
    return;
  }
  plugins.push(plugin);
}

function addPluginByPath(pluginRoot, noUI) {
  addPlugin(loadPlugin(pluginRoot, noUI));
}

function removePlugin(pluginName) {
  const removed = _.remove(plugins, { name: pluginName });
  if (!removed.length) console.warn('No plugin was removed: ' + pluginName);
}

// Load plugins from a plugin project
function loadDevPlugins(prjRoot) {
  const devPort = config.getRekitConfig(false, prjRoot).devPort;
  const featuresDir = path.join(prjRoot, 'src/features');

  fs.readdirSync(featuresDir)
    .map(p => path.join(featuresDir, p))
    .forEach(pluginRoot => {
      const p = loadPlugin(pluginRoot, true);
      if (!p) return;
      if (fs.existsSync(path.join(pluginRoot, 'entry.js'))) {
        p.ui = {
          root: path.join(pluginRoot, 'public'),
          rootLink: `http://localhost:${devPort}/static/js/${p.name}.bundle.js`,
        };
      }
      addPlugin(p);
    });
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

  downloadNpmPackage({ arg: name, dir: paths.configFile('plugins2') }).then(() => {
    console.log('Plugin downloaded, installing its dependencies...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['install', '--colors', '--only=production'], {
      stdio: 'inherit',
      cwd: paths.configFile(`plugins2/${name}`),
    });
    let failed = false;
    child.on('exit', () => {
      if (!failed) console.log('npm install success');
    });
    child.on('error', () => {
      failed = true;
      console.log('npm install failed');
    });
  });
}

function uninstallPlugin(name) {}
function updatePlugin(name) {}

module.exports = {
  getPlugins,
  getPlugin,
  loadPlugins,
  addPlugin,
  addPluginByPath,
  removePlugin,
  getPluginsDir,
  loadDevPlugins,
  addPluginsDir,
  installPlugin,
  uninstallPlugin,
  updatePlugin,
  listInstalledPlugins,
};
