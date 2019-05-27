const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const files = require('./files');
const paths = require('./paths');
const plugin = require('./plugin');
const config = require('./config');
const repo = require('./repo');
const logger = require('./logger');

const app = {};

function getProjectData(args = {}) {
  const prjData = files.readDir(paths.getProjectRoot(), args);
  plugin.getPlugins('app.processProjectData').forEach(p => p.app.processProjectData(prjData, args));
  return prjData;
}

function syncAppRegistryRepo() {
  const registryDir = paths.configPath('app-registry');
  const appRegistry = config.getAppRegistry();
  if (path.isAbsolute(appRegistry)) {
    // if it's local folder, copy to it
    console.log('Sync app registry from local folder.');
    fs.removeSync(registryDir);
    fs.copySync(appRegistry, registryDir);
    return Promise.resolve();
  }
  return repo.sync(appRegistry, registryDir);
}

function getAppTypes(args) {
  if (args && !args.noSync) syncAppRegistryRepo();
  fs.ensureDirSync(paths.configPath('plugins'));
  const appTypes = ['rekit-react', 'rekit-plugin']
    .map(dir => path.join(__dirname, '../plugins', dir))
    .concat(
      fs
        .readdirSync(paths.configPath('plugins'))
        .map(f => paths.configPath(`plugins/${f}`))
        .filter(f => fs.existsSync(path.join(f, 'appType.json'))),
    )
    .map(f => {
      try {
        const obj = fs.readJsonSync(path.join(f, 'appType.json'));
        obj.logo = path.join(f, 'logo.png');
        return obj;
      } catch (err) {
        logger.error(`Failed to load appType.json from: ${f}`, err);
        return null;
      }
    })
    .filter(Boolean);

  const registryJson = paths.configPath('app-registry/appTypes.json');
  if (fs.existsSync(registryJson)) {
    try {
      fs.readJsonSync(registryJson).forEach(appType => {
        appType.logo = paths.configPath(`app-registry/app-types/${appType.id}/logo.png`);
        const found = _.find(appTypes, { id: appType.id });
        if (found) {
          Object.keys(found).forEach(key => delete found[key]);
          Object.assign(found, appType);
        } else appTypes.push(appType);
      });
    } catch (err) {
      logger.info('Failed to read appTypes.json: ', err);
    }
  }
  // appTypes.forEach(appType => {
  //   appType.logo = paths.configPath(`app-registry/app-types/${appType.id}/logo.png`);
  // });
  // const appTypes = fs
  //   .readJsonSync(paths.configPath('app-registry/appTypes.json'))
  //   .filter(t => !t.disabled);
  // appTypes.forEach(appType => {
  //   appType.logo = 'file://' + paths.configPath(`app-registry/app-types/${appType.id}/logo.png`);
  // });
  return appTypes;
}

Object.assign(app, {
  getProjectData,
  getAppTypes,
});

module.exports = app;
