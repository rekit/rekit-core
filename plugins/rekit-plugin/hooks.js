const _ = require('lodash');
const utils = require('../rekit-react/utils');

const getParentPlugin = () => rekit.core.plugin.getPlugin('rekit-react');

module.exports = {
  /* Add prefix to state mapping for connected react component 
   * e.g.
   * function mapStateToProps(state) {
   *   return {
   *     home: state.pluginMyPlugin.home
   *   };
   * }
  */
  afterAddComponent(elePath, args) {
    const pp = getParentPlugin();
    // because this inherit rekit-react plugin, so need manually call inherited hooks
    if (_.has(pp, 'hooks.afterAddComponent')) pp.hooks.afterAddComponent(elePath, args);

    if (args.connect) {
      const { vio } = rekit.core;
      const ele = utils.parseElePath(elePath, 'component');
      const { lastLineIndex } = rekit.core.refactor;
      const match = `    ${_.camelCase(ele.feature)}: state.${_.camelCase(ele.feature)}`;
      const lines = vio.getLines(ele.modulePath);
      const i = lastLineIndex(lines, match);
      lines[i] = `    ${_.camelCase(ele.feature)}: state.${_.camelCase(
        'plugin-'+rekit.core.config.getAppName().replace(/^rekit-plugin-/, ''),
      )}.${_.camelCase(ele.feature)}`;
    }
  },
};
