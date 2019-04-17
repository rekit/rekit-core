'use strict';

// Summary:
//  Load plugins

// Set the node_modules of Rekit Studio as the NODE_PATH to find modules.
// So that plugin could use dependencies of Rekit Studio and Rekit Core.
const utils = require('./utils');
const nodeModulesPath = require.resolve('lodash').replace('/lodash/lodash.js', '');
utils.addNodePath(nodeModulesPath);
// console.log('node modules path: ', nodeModulesPath);
// process.env.NODE_PATH = nodeModulesPath;
// require('module').Module._initPaths();

const fs = require('fs-extra');
const path = require('path');
const spawn = require('child_process').spawn;
const _ = require('lodash');
const os = require('os');
const paths = require('./paths');
const config = require('./config');
const downloadNpmPackage = require('download-npm-package');

let appliedPlugins = undefined;
let allPlugins = [];
let loaded = false;
let needFilterPlugin = true;

const DEFAULT_PLUGIN_DIR = path.join(os.homedir(), '.rekit/plugins');
const BUILT_IN_UI_PLUGINS = [
  'rekit-react-ui',
  'rekit-plugin-ui',
  'default',
  'test',
  'terminal',
  'scripts',
  'git-manager',
];

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
  return prop ? appliedPlugins.filter(_.property(prop)) : appliedPlugins;
}

function filterPluginsIfNecessary() {
  initPluginsIfNecessary();
  if (!needFilterPlugin) return;
  const rekitConfig = config.getRekitConfig();

  // A plugin could decide if it's fit for the current project by feature files
  appliedPlugins = allPlugins.filter(checkFeatureFiles);
  console.log('All plugins: ', allPlugins.map(p => p.name));
  if (!rekitConfig.appType) {
    // This is used to support Rekit 2.x project which are all rekit-react project
    // Otherwise every project should have appType configured.
    if (
      [
        'src/Root.js',
        'src/features',
        'src/common/rootReducer.js',
        'src/common/routeConfig.js',
      ].every(f => fs.existsSync(paths.map(f)))
    ) {
      config.setAppType('rekit-react');
    } else {
      config.setAppType('common');
    }
  }
  const appType = rekitConfig.appType;
  appliedPlugins = appliedPlugins.filter(
    p => (!p.shouldUse || p.shouldUse(paths.getProjectRoot())) && (!p.appType || _.castArray(p.appType).includes(appType)),
  );
  console.log('Applied plugins for appType ' + appType + ': ', appliedPlugins.map(p => p.name));
  needFilterPlugin = false;
}

function initPluginsIfNecessary() {
  allPlugins = allPlugins.map(plugin => {
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
  return _.find(allPlugins, { name }) || null;
}

// Load plugin instance, plugin depends on project config
function loadPlugin(pluginRoot, noUI) {
  // noUI flag is used for loading dev plugins whose ui is from webpack dev server
  try {
    const pkgJsonPath = path.join(pluginRoot, 'package.json');
    let pkgJson = null;
    if (fs.existsSync(pkgJsonPath)) {
      pkgJson = fs.readJsonSync(pkgJsonPath);
    }
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
    if (pkgJson) {
      ['appType', 'name', 'isAppPlugin', 'featureFiles'].forEach(key => {
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
    }

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

// Load plugins from a plugin project
// function loadDevPlugins(prjRoot) {
//   const devPort = config.getRekitConfig(false, prjRoot).devPort;
//   const featuresDir = path.join(prjRoot, 'src/features');

//   fs.readdirSync(featuresDir)
//     .map(p => path.join(featuresDir, p))
//     .forEach(pluginRoot => {
//       const p = loadPlugin(pluginRoot, true);
//       if (!p) return;
//       if (fs.existsSync(path.join(pluginRoot, 'entry.js'))) {
//         p.ui = {
//           root: path.join(pluginRoot, 'public'),
//           rootLink: `http://localhost:${devPort}/static/js/${p.name}.bundle.js`,
//         };
//       }
//       addPlugin(p);
//     });
// }

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
  addPluginsDir,
  installPlugin,
  uninstallPlugin,
  updatePlugin,
  listInstalledPlugins,
};
