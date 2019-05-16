const files = require('./files');
const paths = require('./paths');
const plugin = require('./plugin');

const app = {};

function getProjectData(args = {}) {
  const prjData = files.readDir(paths.getProjectRoot(), args);
  plugin.getPlugins('app.processProjectData').forEach(p => p.app.processProjectData(prjData, args));
  return prjData;
  // const plugins = plugin.getPlugins('app.getProjectData');
  // const prjData = {};
  // plugins.forEach(p => Object.assign(prjData, p.app.getProjectData(args)));

  // app.lastGetProjectDataTimestamp = files.lastChangeTime;
  // return prjData;
}

Object.assign(app, {
  getProjectData,
});

module.exports = app;
