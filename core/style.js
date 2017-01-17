'use strict';

const _ = require('lodash');
const utils = require('./utils');
const vio = require('./vio');
// const refactor = require('./refactor');
const template = require('./template');
const entry = require('./entry');

module.exports = {
  add(feature, component, args) {
    // Create style file for a component
    args = args || {};
    template.generate(utils.mapComponent(feature, component) + '.' + utils.getCssExt(), Object.assign({}, args, {
      templateFile: args.templateFile || 'Component.less',
      context: Object.assign({
        feature,
        component,
        depth: 2,
        cssExt: utils.getCssExt(),
      }, args.context || {}),
    }));

    entry.addToStyle(feature, component);
  },

  remove(feature, component) {
    // Remove style file of a component
    vio.del(utils.mapComponent(feature, component) + '.' + utils.getCssExt());
    entry.removeFromStyle(feature, component);
  },

  move(source, target) {
    // 1. Move File.less to the destination
    // 2. Rename css class name
    // 3. Update references in the style.less

    source.feature = _.kebabCase(source.feature);
    source.name = _.pascalCase(source.name);
    target.feature = _.kebabCase(target.feature);
    target.name = _.pascalCase(target.name);

    const srcPath = utils.mapComponent(source.feature, source.name) + '.' + utils.getCssExt();
    const targetPath = utils.mapComponent(target.feature, target.name) + '.' + utils.getCssExt();
    vio.move(srcPath, targetPath);

    let lines = vio.getLines(targetPath);
    const oldCssClass = `${_.kebabCase(source.feature)}-${_.kebabCase(source.name)}`;
    const newCssClass = `${_.kebabCase(target.feature)}-${_.kebabCase(target.name)}`;

    lines = lines.map(line => line.replace(`.${oldCssClass}`, `.${newCssClass}`));
    vio.save(targetPath, lines);

    if (source.feature === target.feature) {
      entry.renameInStyle(source.feature, source.name, target.name);
    } else {
      entry.removeFromStyle(source.feature, source.name);
      entry.addToStyle(target.feature, target.name);
    }
  },
};
