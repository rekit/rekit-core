'use strict';

const _ = require('lodash');
const utils = require('./utils');
const vio = require('./vio');
const refactor = require('./refactor');
const template = require('./template');
const entry = require('./entry');
const assert = require('./assert');

function add(feature, component, args) {
  assert.notEmpty(feature, 'feature');
  assert.notEmpty(component, 'component name');
  assert.featureExist(feature);

  feature = _.kebabCase(feature);
  component = _.pascalCase(component);

  // create component from template
  args = args || {};
  template.generate(utils.mapComponent(feature, component) + '.js', Object.assign({}, args, {
    templateFile: args.templateFile || 'Component.js',
    context: Object.assign({ feature, component }, args.context || {}),
  }));

  // add to index.js
  entry.addToIndex(feature, component);
}

function remove(feature, component) {
  assert.notEmpty(feature, 'feature');
  assert.notEmpty(component, 'component name');
  assert.featureExist(feature);

  feature = _.kebabCase(feature);
  component = _.pascalCase(component);

  vio.del(utils.mapComponent(feature, component) + '.js');
  entry.removeFromIndex(feature, component);
}

function move(source, target) {
  // 1. Move File.js to the targetination
  // 2. Rename module name
  source.feature = _.kebabCase(source.feature);
  source.name = _.pascalCase(source.name);
  target.feature = _.kebabCase(target.feature);
  target.name = _.pascalCase(target.name);

  const srcPath = utils.mapComponent(source.feature, source.name) + '.js';
  const targetPath = utils.mapComponent(target.feature, target.name) + '.js';
  vio.move(srcPath, targetPath);

  const oldCssClass = `${source.feature}-${_.kebabCase(source.name)}`;
  const newCssClass = `${target.feature}-${_.kebabCase(target.name)}`;

  refactor.updateFile(targetPath, ast => [].concat(
    refactor.renameClassName(ast, source.name, target.name),
    refactor.renameCssClassName(ast, oldCssClass, newCssClass)
  ));

  if (source.feature === target.feature) {
    entry.renameInIndex(source.feature, source.name, target.name);
  } else {
    entry.removeFromIndex(source.feature, source.name);
    entry.addToIndex(target.feature, target.name);
  }
}

module.exports = {
  add,
  remove,
  move,
};
