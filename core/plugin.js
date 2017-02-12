'use strict';

// Summary:
//  Load plugins and export helper modules

const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const utils = require('./utils');
// const template = require('./template');

let plugins = null;
function getPlugins() {
  if (!plugins) {
    loadPlugins(); // eslint-disable-line
    // utils.fatal('Plugins have not been loaded.');
  }
  return plugins;
}

function injectExtensionPoints(func, command, targetName) {
  // Summary:
  //  Hook: add/move/remove elements

  function execExtension(hookName, args) {
    getPlugins().forEach((p) => {
      if (p.hooks && p.hooks[hookName]) {
        p.hooks[hookName].apply(p.hooks, args);
      }
    });
  }

  return function() { // eslint-disable-line
    const beforeHook = `before${_.pascalCase(command)}${_.pascalCase(targetName)}`;
    execExtension(beforeHook, arguments);

    const res = func.apply(null, arguments);

    const afterHook = `after${_.pascalCase(command)}${_.pascalCase(targetName)}`;
    execExtension(afterHook, arguments);

    return res;
  };
}

function loadPlugins() {
  const prjRoot = utils.getProjectRoot();

  const prjPkgJson = require(path.join(prjRoot, 'package.json')); // eslint-disable-line

  // Find local plugins, all local plugins are loaded
  const localPluginsFolder = path.join(prjRoot, 'tools/plugins');
  plugins = [];
  if (shell.test('-e', localPluginsFolder)) {
    plugins = plugins.concat(shell.ls(localPluginsFolder)
      .filter(d => shell.test('-d', path.join(prjRoot, 'tools/plugins', d)))
      .map(d => path.join(prjRoot, 'tools/plugins', d)));
  }

  // Find installed plugins, only those defined in package.rekit.plugins are loaded.
  if (prjPkgJson.rekit && prjPkgJson.rekit.plugins) {
    plugins = plugins.concat(prjPkgJson.rekit.plugins.map(p => (
      path.isAbsolute(p)
      ? p
      : path.join(
          prjRoot,
          'node_modules',
          /^rekit-plugin-/.test(p) ? p : ('rekit-plugin-' + p)
        )
      )
    )); // rekit plugin should be prefixed with 'rekit-plugin'.
  }
console.log('plugins: ', plugins);
  // Create plugin instances
  plugins = plugins.map((pluginRoot) => {
    try {
      const config = require(path.join(pluginRoot, 'config')); // eslint-disable-line
      const item = {
        config,
        commands: {},
        hooks: {},
      };

      if (config.accept) {
        config.accept.forEach(
          (name) => {
            name = _.camelCase(name);
            const commands = require(path.join(pluginRoot, name));
            item.commands[name] = {};
            Object.keys(commands).forEach((key) => {
              item.commands[name][key] = injectExtensionPoints(commands[key], key, name);
            });
          }
        );
      }

      if (shell.test('-e', path.join(pluginRoot, 'hooks.js'))) {
        item.hooks = require(path.join(pluginRoot, 'hooks')); // eslint-disable-line
      }

      return item;
    } catch (e) {
      utils.fatalError(`Failed to load plugin: ${path.basename(pluginRoot)}, ${e}`);
    }

    return null;
  });
}

// Get the first matched command provided by some plugin
// Local plugin first, then installed plugin.
function getCommand(command, elementName) {
  // example: commands.asyncActionSaga.add
  const keyPath = `commands.${_.camelCase(elementName)}.${_.camelCase(command)}`;
  const found = getPlugins().find(item => _.has(item, keyPath));
  if (found) {
    return _.get(found, keyPath);
  }
  return null;
}

// function add(name) {
//   // Summary:
//   //  Add a local plugin.
//   name = _.kebabCase(name);

//   const pluginDir = path.join(utils.getProjectRoot(), 'tools/plugins', name);
//   shell.mkdir(pluginDir);
//   const configPath = path.join(pluginDir, name, 'config.js');
//   template.generate(configPath, {
//     templateFile: 'plugin/config.js',
//     context: {
//       pluginName: name,
//     },
//   });
// }

module.exports = {
  // add,
  getCommand,
  loadPlugins,
  getPlugins,
  injectExtensionPoints,
};
