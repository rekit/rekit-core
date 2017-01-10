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

function move(source, dest) {
  // 1. Move File.js to the destination
  // 2. Rename module name
  source.feature = _.kebabCase(source.feature);
  source.name = _.pascalCase(source.name);
  dest.feature = _.kebabCase(dest.feature);
  dest.name = _.pascalCase(dest.name);

  const srcPath = utils.mapComponent(source.feature, source.name) + '.js';
  const destPath = utils.mapComponent(dest.feature, dest.name) + '.js';
  vio.move(srcPath, destPath);

  const oldCssClass = `${source.feature}-${source.name}`;
  const newCssClass = `${dest.feature}-${dest.name}`;

  refactor.renameClassName(destPath, source.name, dest.name);
  refactor.renameCssClassName(destPath, oldCssClass, newCssClass);

  // const ast = vio.getAst(destPath);
  // const changes = [].concat(
  //   refactor.renameClassName(ast, source.name, dest.name),
  //   refactor.renameCssClassName(ast, oldCssClass, newCssClass)
  // );

  // let code = vio.getContent(destPath);
  // code = refactor.updateSourceCode(code, changes);
  // vio.save(destPath, code);

  if (source.feature === dest.feature) {
    entry.renameInIndex(source.feature, source.name, dest.name);
  } else {
    entry.removeFromIndex(source.feature, source.name);
    entry.addToIndex(dest.feature, dest.name);
  }
}

module.exports = {
  add,
  remove,
  move,
};
