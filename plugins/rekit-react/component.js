/* eslint no-lonely-if:0 */
const _ = require('lodash');
const entry = require('./entry');
const route = require('./route');
const style = require('./style');
const utils = require('./utils');
const prefix = require('./prefix');

const { vio, template, refactor } = rekit.core;
const { parseElePath } = utils;

// Add a component
// elePath format: home/MyComponent, home/subFolder/MyComponent
function add(elePath, args) {
  const { connect, urlPath, componentType } = args;
  const ele = parseElePath(elePath, 'component');
  let tplFile;
  if (connect) {
    if (componentType === 'functional') {
      tplFile = 'FuncComponent.js.tpl';
    } else {
      tplFile = 'ConnectedComponent.js.tpl';
    }
  } else {
    if (componentType === 'functional') {
      tplFile = 'FuncComponent.js.tpl';
    } else {
      tplFile = 'Component.js.tpl';
    }
  }
  let hooks = args.hooks || [];
  if (typeof hooks === 'string') {
    hooks = hooks.split(',').map(s => s.trim());
  }
  // const tplFile = connect ? 'ConnectedComponent.js.tpl' : 'Component.js.tpl';
  if (vio.fileExists(ele.modulePath)) {
    throw new Error(`Failed to add component: target file already exsited: ${ele.modulePath}`);
  }
  if (vio.fileExists(ele.stylePath)) {
    throw new Error(`Failed to add component: target file already exsited: ${ele.stylePath}`);
  }
  const pre = prefix.getPrefix() ? _.kebabCase(prefix.getPrefix()) + '_' : '';
  template.generate(ele.modulePath, {
    templateFile: tplFile,
    cwd: __dirname,
    context: { ...args, ele, prefix: pre, hooks, componentType },
  });

  style.add(ele, args);
  entry.addToIndex(ele, args);
  if (urlPath) {
    route.add(ele.path, args);
  }
}

function remove(elePath, args) {
  // Remove component module
  const ele = parseElePath(elePath, 'component');
  vio.del(ele.modulePath);

  style.remove(ele, args);
  entry.removeFromIndex(ele, args);
  route.remove(ele.path, args);
}

function move(source, target, args) {
  const sourceEle = parseElePath(source, 'component');
  const targetEle = parseElePath(target, 'component');
  vio.move(sourceEle.modulePath, targetEle.modulePath);
  const pre = prefix.getPrefix() ? _.kebabCase(prefix.getPrefix()) + '_' : '';
  const oldCssClass = `${pre}${sourceEle.feature}-${_.kebabCase(sourceEle.name)}`;
  const newCssClass = `${pre}${targetEle.feature}-${_.kebabCase(targetEle.name)}`;

  refactor.updateFile(targetEle.modulePath, ast =>
    [].concat(
      refactor.renameClassName(ast, sourceEle.name, targetEle.name),
      refactor.renameFunctionName(ast, sourceEle.name, targetEle.name),
      refactor.renameCssClassName(ast, oldCssClass, newCssClass),
    ),
  );

  if (sourceEle.feature === targetEle.feature) {
    entry.renameInIndex(sourceEle.feature, sourceEle.name, targetEle.name);
  } else {
    entry.removeFromIndex(sourceEle);
    entry.addToIndex(targetEle);
  }

  style.move(sourceEle, targetEle, args);
  route.move(source, target, args);
}

module.exports = {
  add,
  remove,
  move,
};
