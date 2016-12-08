'use strict';

// Summary
//  API wrapper for managing Rekit elements.

const _ = require('lodash');
const component = require('./core/component');
const style = require('./core/style');
const test = require('./core/test');
const action = require('./core/action');
const featureMgr = require('./core/feature');
const utils = require('./core/utils');
const vio = require('./core/vio');
const refactor = require('./core/refactor');
const entry = require('./core/entry');
const plugin = require('./core/plugin');
const injectExtensionPoints = require('./core/plugin').injectExtensionPoints;

function addComponent(feature, name) {
  component.add(feature, name);
  style.add(feature, name);
  test.add(feature, name);
}

function removeComponent(feature, name) {
  component.remove(feature, name);
  style.remove(feature, name);
  test.remove(feature, name);
}

function moveComponent(source, dest) {
  component.move(source, dest);
  test.move(source, dest);
  style.move(source, dest);
}

function addPage(feature, name, urlPath, isIndex) {
  component.add(feature, name, { templateFile: 'Page.js' });
  entry.addToRoute(feature, name, urlPath, isIndex);
  style.add(feature, name);
  test.add(feature, name, { templateFile: 'Page.test.js' });
}

function removePage(feature, name, urlPath) {
  component.remove(feature, name);
  entry.removeFromRoute(feature, name, urlPath);
  style.remove(feature, name);
  test.remove(feature, name);
}

function movePage(source, dest) {
  moveComponent(source, dest);
  entry.moveRoute(source, dest);
}

function addAction(feature, name, actionType) {
  action.add(feature, name, { actionType });
  test.addAction(feature, name, { actionType });
}

function removeAction(feature, name, actionType) {
  action.remove(feature, name, actionType);
  test.removeAction(feature, name);
}

function moveAction(source, dest, isAsync) {
  action.move(source, dest, isAsync);
  test.moveAction(source, dest, isAsync);
}

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

function addFeature(name) {
  featureMgr.add(name);
  entry.addToRootReducer(name);
  entry.addToRouteConfig(name);
  entry.addToRootStyle(name);

  // Add default page and sample action
  addPage(name, 'default-page', null, true);
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
  addPage: injectExtensionPoints(addPage, 'add', 'page'),
  removePage: injectExtensionPoints(removePage, 'remove', 'page'),
  movePage: injectExtensionPoints(movePage, 'move', 'page'),
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
    case 'remove':
      params.push(splitName(args.name).feature);
      params.push(splitName(args.name).name);
      break;

    case 'move':
      params.push(splitName(args.source));
      params.push(splitName(args.target));
      break;

    default:
      break;
  }
  params.push(args);

  let cmd = plugin.getCommand(args.commandName, args.type);
  if (!cmd) {
    cmd = coreCommands[_.camelCase(args.commandName + '-' + args.type)];
  }

  if (!cmd) {
    utils.fatalError('Can\'t find the desired command.');
  }
  cmd.apply(null, params);
}

module.exports = Object.assign({
  vio,
  refactor,
  utils,
  component,
  style,
  test,
  action,
  feature: featureMgr,
  entry,

  handleCommand,
}, coreCommands);

// NOTE: plugin.loadPlutins should be executed after module.exports to avoid circular dependency
plugin.loadPlugins();
