const files = require('./files');
const plugin = require('./plugin');

const app = {};

function getProjectData(args = {}) {
  const plugins = plugin.getPlugins('app.getProjectData');
  const prjData = {};
  console.log('plugins: ', plugins.map(p=>p.name))
  if (plugins.length) {
    
    plugins.forEach(p => console.log(p.name) || Object.assign(prjData, p.app.getProjectData(args)));
  }

  app.lastGetProjectDataTimestamp = files.lastChangeTime;
  return prjData;
}

Object.assign(app, {
  getProjectData,
});

module.exports = app;
