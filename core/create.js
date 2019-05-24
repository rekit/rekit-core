/*
 * Create a Rekit project. Boilerplates are provided by Rekit plugins.
 *
 * To create a Rekit project:
 *  - If options.source is a local folder, then copy content from it (excepts node_modules and .git folders),
 *    if it's a git url, clone it.
 *  - Otherwise, looks for project type registry from https://github.com/supnate/rekit-registry/appTypes.json,
 *    clone the repo to the project folder.
 *  - Execute postCreate.js
 *
 */

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const config = require('./config');
const paths = require('./paths');
const repo = require('./repo');
const app = require('./app');
/*
  options: {
    status: callback
    source: where to create app from
  }
*/
function create(options) {
  console.log('Creating app: ', options.name);

  if (!options.status)
    options.status = (code, msg) => {
      console.log(msg);
    };
  if (!options.type) options.type = 'rekit-react';

  const prjDir = path.join(options.location || process.cwd(), options.name);
  return new Promise(async (resolve, reject) => {
    try {
      if (fs.existsSync(prjDir)) {
        reject('FOLDER_EXISTS');
        return;
      }
      fs.mkdirSync(prjDir);
      let gitRepo;
      if (options.source) {
        if (/^https?:|^git@|^direct:/.test(options.source)) {
          // It's a git repo
          gitRepo = options.source;
        } else {
          // It's a local folder
          const srcDir = path.isAbsolute(options.source)
            ? options.source
            : path.join(process.cwd(), options.source);
          options.status('CREATE_APP_COPY_FILES', `Copy files from ${srcDir}...`);
          await fs.copy(srcDir, prjDir, {
            filter: src =>
              !/\/(\.git|node_modules\/|node_modules$)/.test(src) ||
              path.basename(src) === '.gitignore',
          });
        }
      } else if (options.type) {
        // Get gitRepo
        options.status(
          'QUERY_APP_TYPES_GIT_REPO',
          `Looking for the git repo for app type ${options.type}...`,
        );
        const appTypes = app.getAppTypes();
        const appType = _.find(appTypes, { id: options.type });
        if (!appType) reject('APP_TYPE_NOT_SUPPORTED');
        gitRepo = appType.repo;
      } else {
        await fs.remove(prjDir);
        reject('NO_SOURCE_OR_APP_TYPE');
      }

      if (gitRepo) {
        options.status('CLONE_PROJECT', `Downloading project from ${gitRepo}...`);
        await repo.clone(gitRepo, prjDir);
      }

      postCreate(prjDir, options);
      options.status('CREATION_SUCCESS', '😃App creation success.');
      resolve();
    } catch (err) {
      console.log('Failed to create project.');
      fs.removeSync(prjDir);
      reject(err);
    }
  });
}

// function getAppTypes() {
//   return new Promise((resolve, reject) => {
//     syncAppRegistryRepo()
//       .then(() => {
//         resolve(fs.readJsonSync(paths.configFile('app-registry/appTypes.json')));
//       })
//       .catch(err => {
//         console.log('Failed to get app types: ', err);
//         reject('GET_APP_TYPES_FAILED');
//       });
//   });
// }

function postCreate(prjDir, options) {
  const postCreateScript = path.join(prjDir, 'postCreate.js');
  if (fs.existsSync(postCreateScript)) {
    options.status('POST_CREATE', 'Executing post create script...');
    require(postCreateScript)(options);
    fs.removeSync(postCreateScript);
  }
}

function syncAppRegistryRepo() {
  const registryDir = paths.configFile('app-registry');
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

module.exports = create;
module.exports.syncAppRegistryRepo = syncAppRegistryRepo;
// module.exports.getAppTypes = getAppTypes;
