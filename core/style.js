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

  move(source, dest) {
    // 1. Move File.less to the destination
    // 2. Rename css class name
    // 3. Update references in the style.less

    source.feature = _.kebabCase(source.feature);
    source.name = _.pascalCase(source.name);
    dest.feature = _.kebabCase(dest.feature);
    dest.name = _.pascalCase(dest.name);

    const srcPath = utils.mapComponent(source.feature, source.name) + '.' + utils.getCssExt();
    const destPath = utils.mapComponent(dest.feature, dest.name) + '.' + utils.getCssExt();
    vio.move(srcPath, destPath);

    let lines = vio.getLines(destPath);
    const oldCssClass = `${_.kebabCase(source.feature)}-${_.kebabCase(source.name)}`;
    const newCssClass = `${_.kebabCase(dest.feature)}-${_.kebabCase(dest.name)}`;

    lines = lines.map(line => line.replace(`.${oldCssClass}`, `.${newCssClass}`));
    vio.save(destPath, lines);

    if (source.feature === dest.feature) {
      entry.renameInStyle(source.feature, source.name, dest.name);
    } else {
      entry.removeFromStyle(source.feature, source.name);
      entry.addToStyle(dest.feature, dest.name);
    }
  },
};
