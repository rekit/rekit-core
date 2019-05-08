const app = require('./app');

module.exports = {
  name: 'rekit-plugin',
  appType: 'rekit-plugin',
  inherit: 'rekit-react',
  app,
  hooks: require('./hooks'),
  initialize() {
    // inherited from rekit-react
    this.prefix.setPrefix(rekit.core.config.getAppName().replace(/^rekit-plugin-/, ''));
  },
};
