const app = require('./app');

module.exports = {
  name: 'rekit-plugin-core',
  appType: 'rekit-plugin',
  inherit: 'rekit-react-core',
  app,
  initialize() {
    // inherited from rekit-react-core
    this.prefix.setPrefix(rekit.core.config.getAppName().replace(/^rekit-plugin-/, ''));
  },
};
