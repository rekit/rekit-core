const app = require('./app');

module.exports = {
  name: 'rekit-plugin-core',
  appType: 'rekit-plugin',
  isAppPlugin: true,
  inherit: 'rekit-react-core',
  featureFiles: null,
  app,
};
