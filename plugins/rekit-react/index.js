const app = require('./app');
const feature = require('./feature');
const component = require('./component');
const action = require('./action');
const hooks = require('./hooks');

module.exports = {
  name: 'rekit-react',
  appType: 'rekit-react',
  app,
  hooks,
  prefix: require('./prefix'),
  elements: {
    feature,
    component,
    action,
  },
};
