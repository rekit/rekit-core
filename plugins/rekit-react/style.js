'use strict';

/**
 * Style manager. It manage style files for components. Usually used with component manage.
 * @module
 **/
const _ = require('lodash');
const entry = require('./entry');
const prefix = require('./prefix');

const { vio, template } = rekit.core;

function add(ele, args) {
  // Create style file for a component
  // const ele = utils.parseElePath(elePath, 'style');
  const pre = prefix.getPrefix() ? _.kebabCase(prefix.getPrefix()) + '_' : '';
  template.generate(
    ele.stylePath,
    Object.assign({}, args, {
      templateFile: 'rekit-react:Component.less.tpl',
      cwd: __dirname,
      context: {
        ele,
        prefix: pre,
        ...args,
      },
    }),
  );

  entry.addToStyle(ele);
}

function remove(ele) {
  // Remove style file of a component
  // const ele = utils.parseElePath(elePath, 'style');
  vio.del(ele.stylePath);
  entry.removeFromStyle(ele);
}

function move(sourceEle, targetEle) {
  // 1. Move File.less to the destination
  // 2. Rename css class name
  // 3. Update references in the style.less

  vio.move(sourceEle.stylePath, targetEle.stylePath);
  const pre = prefix.getPrefix() ? _.kebabCase(prefix.getPrefix()) + '_' : '';

  let lines = vio.getLines(targetEle.stylePath);
  const oldCssClass = `${pre}${_.kebabCase(sourceEle.feature)}-${_.kebabCase(sourceEle.name)}`;
  const newCssClass = `${pre}${_.kebabCase(targetEle.feature)}-${_.kebabCase(targetEle.name)}`;

  lines = lines.map(line => line.replace(`.${oldCssClass}`, `.${newCssClass}`));
  vio.save(targetEle.stylePath, lines);

  if (sourceEle.feature === targetEle.feature) {
    entry.renameInStyle(sourceEle.feature, sourceEle.name, targetEle.name);
  } else {
    entry.removeFromStyle(sourceEle);
    entry.addToStyle(targetEle);
  }
}

module.exports = {
  add,
  move,
  remove,
};
