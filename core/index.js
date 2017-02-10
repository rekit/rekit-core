'use strict';

// Summary
//  API wrapper for managing Rekit elements.

const _ = require('lodash');
const component = require('./component');
const style = require('./style');
const test = require('./test');
const action = require('./action');
const featureMgr = require('./feature');
const utils = require('./utils');
const vio = require('./vio');
const refactor = require('./refactor');
const entry = require('./entry');
const route = require('./route');
const template = require('./template');
const plugin = require('./plugin');
const constant = require('./constant');

const injectExtensionPoints = plugin.injectExtensionPoints;

function addComponent(feature, name, args) {
  feature = _.kebabCase(feature);
  name = _.pascalCase(name);

  args = args || {};
  component.add(feature, name, {
    templateFile: args.connect ? 'ConnectedComponent.js' : 'Component.js',
  });
  if (args.urlPath) {
    let urlPath = args.urlPath;
    if (urlPath === '$auto') urlPath = name;
    urlPath = _.kebabCase(urlPath);
    route.add(feature, name, { urlPath, isIndex: !!args.isIndex });
  }
  style.add(feature, name);
  test.add(feature, name, {
    templateFile: args.connect ? 'ConnectedComponent.test.js' : 'Component.test.js',
  });
}

function removeComponent(feature, name) {
  feature = _.kebabCase(feature);
  name = _.pascalCase(name);
  component.remove(feature, name);
  route.remove(feature, name);
  style.remove(feature, name);
  test.remove(feature, name);
}

function moveComponent(source, target) {
  source.feature = _.kebabCase(source.feature);
  source.name = _.pascalCase(source.name);
  target.feature = _.kebabCase(target.feature);
  target.name = _.pascalCase(target.name);

  component.move(source, target);
  test.move(source, target);
  style.move(source, target);
  route.move(source, target);
}

// function addPage(feature, name, args) {
//   feature = _.kebabCase(feature);
//   name = _.pascalCase(name);

//   component.add(feature, name, { templateFile: 'ConnectedComponent.js' });
//   entry.addToRoute(feature, name, args);
//   style.add(feature, name);
//   test.add(feature, name, { templateFile: 'ConnectedComponent.test.js' });
// }

// function removePage(feature, name, args) {
//   feature = _.kebabCase(feature);
//   name = _.pascalCase(name);

//   component.remove(feature, name);
//   entry.removeFromRoute(feature, name, args);
//   style.remove(feature, name);
//   test.remove(feature, name);
// }

// function movePage(source, target) {
//   source.feature = _.kebabCase(source.feature);
//   source.name = _.pascalCase(source.name);
//   target.feature = _.kebabCase(target.feature);
//   target.name = _.pascalCase(target.name);

//   moveComponent(source, target);
//   entry.moveRoute(source, target);
// }

function addAsyncAction(feature, name) {
  action.addAsync(feature, name);
  test.addAction(feature, name, { isAsync: true });
}

function removeAsyncAction(feature, name) {
  action.removeAsync(feature, name);
  test.removeAction(feature, name);
}

function moveAsyncAction(source, dest) {
  action.moveAsync(source, dest);
  test.moveAction(source, dest, true);
}

function addAction(feature, name, args) {
  args = args || {};
  if (args.async) {
    addAsyncAction(feature, name);
    return;
  }
  action.add(feature, name);
  test.addAction(feature, name);
}

function removeAction(feature, name, args) {
  args = args || {};
  if (args.async) {
    removeAsyncAction(feature, name);
    return;
  }
  action.remove(feature, name);
  test.removeAction(feature, name);
}

function moveAction(source, dest, args) {
  args = args || {};
  if (args.async) {
    moveAsyncAction(source, dest);
    return;
  }
  action.move(source, dest);
  test.moveAction(source, dest);
}

function addFeature(name) {
  featureMgr.add(name);
  entry.addToRootReducer(name);
  entry.addToRouteConfig(name);
  entry.addToRootStyle(name);

  // Add default page and sample action
  addComponent(name, 'default-page', { isIndex: true, connect: true, urlPath: '$auto' });
  addAction(name, 'sample-action');
}

function removeFeature(name) {
  featureMgr.remove(name);
  entry.removeFromRootReducer(name);
  entry.removeFromRouteConfig(name);
  entry.removeFromRootStyle(name);
}

function moveFeature(oldName, newName) {
  featureMgr.move(oldName, newName);
}

const coreCommands = {
  addComponent: injectExtensionPoints(addComponent, 'add', 'component'),
  removeComponent: injectExtensionPoints(removeComponent, 'remove', 'component'),
  moveComponent: injectExtensionPoints(moveComponent, 'move', 'component'),
  // addPage: injectExtensionPoints(addPage, 'add', 'page'),
  // removePage: injectExtensionPoints(removePage, 'remove', 'page'),
  // movePage: injectExtensionPoints(movePage, 'move', 'page'),
  addAction: injectExtensionPoints(addAction, 'add', 'action'),
  removeAction: injectExtensionPoints(removeAction, 'remove', 'action'),
  moveAction: injectExtensionPoints(moveAction, 'move', 'action'),
  addAsyncAction: injectExtensionPoints(addAsyncAction, 'add', 'async-action'),
  removeAsyncAction: injectExtensionPoints(removeAsyncAction, 'remove', 'async-action'),
  moveAsyncAction: injectExtensionPoints(moveAsyncAction, 'move', 'async-action'),
  addFeature: injectExtensionPoints(addFeature, 'add', 'feature'),
  removeFeature: injectExtensionPoints(removeFeature, 'remove', 'feature'),
  moveFeature: injectExtensionPoints(moveFeature, 'move', 'feature'),
};

function splitName(name) {
  const arr = name.split('/');
  return {
    feature: arr[0],
    name: arr[1],
  };
}

function handleCommand(args) {
  const params = [];
  switch (args.commandName) {
    case 'add':
    case 'remove': {
      if (args.type === 'feature') params.push(args.name);
      else {
        params.push(splitName(args.name).feature);
        params.push(splitName(args.name).name);
      }
      break;
    }
    case 'move': {
      if (args.type === 'feature') {
        params.push(args.source);
        params.push(args.target);
      } else {
        params.push(splitName(args.source));
        params.push(splitName(args.target));
      }
      break;
    }
    default:
      break;
  }
  params.push(args);

  let cmd = plugin.getCommand(args.commandName, args.type);
  if (!cmd) {
    cmd = coreCommands[_.camelCase(args.commandName + '-' + args.type)];
  }

  if (!cmd) {
    utils.fatalError(`Can't find the desired command: ${args.commandName}`);
  }
  cmd.apply(null, params);
}

module.exports = Object.assign({
  vio,
  refactor,
  utils,
  component,
  constant,
  style,
  test,
  action,
  template,
  feature: featureMgr,
  entry,
  route,
  plugin,

  handleCommand,
}, coreCommands);

// NOTE: plugin.loadPlutins should be executed after module.exports to avoid circular dependency
plugin.loadPlugins();
