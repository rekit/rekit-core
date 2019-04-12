const app = require('./app');
const feature = require('./feature');
const component = require('./component');
const action = require('./action');
const hooks = require('./hooks');

module.exports = {
  name: 'rekit-react-core',
  appType: 'rekit-react',
  isAppPlugin: true,
  featureFiles: [
    'src/Root.js',
    'src/features',
    'src/common/rootReducer.js',
    'src/common/routeConfig.js',
  ],
  app,
  hooks,
  elements: {
    feature,
    component,
    action,
  },
};
