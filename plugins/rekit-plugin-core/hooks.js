/* global rekit */
const _ = require('lodash');
const { parseElePath } = require('../rekit-react-core/utils');

module.exports = {
  afterAddComponent(elePath) {
    // rename component css class to include plugin name
    const { config, refactor, vio } = rekit.core;
    const appName = config.getAppName().replace(/^rekit-plugin-/, '');
    const ele = parseElePath(elePath);

    const oldCssClass = `${ele.feature}-${_.kebabCase(ele.name)}`;
    const newCssClass = `${_.kebabCase(appName)}_${ele.feature}-${_.kebabCase(ele.name)}`;

    // Rename class name of the root node of the component
    refactor.renameCssClassName(ele.modulePath, oldCssClass, newCssClass);

    // Rename css class in the style file
    const lines = vio
      .getLines(ele.stylePath)
      .map(line => line.replace(`.${oldCssClass}`, `.${newCssClass}`));
    vio.save(ele.stylePath, lines);
  },
  afterMoveComponent(...args) {},
  afterAddAction(...args) {
    // rename action types
  },
  afterMoveAction(...args) {},
};
