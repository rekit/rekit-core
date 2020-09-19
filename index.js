require('dotenv').config();
global.rekit = {
  element: require('./lib/element'),
  plugin: require('./lib/plugin'),
  paths: require('./lib/paths'),
};
// const _ = require('lodash');
// const app = require('./core/app');
// const element = require('./core/element');
// const plugin = require('./core/plugin');
// const paths = require('./core/paths');
// const files = require('./core/files');
// const vio = require('./core/vio');
// const template = require('./core/template');
// const config = require('./core/config');
// const ast = require('./core/ast');
// const refactor = require('./core/refactor');
// const deps = require('./core/deps');
// const dependents = require('./core/dependents');
// const handleCommand = require('./core/handleCommand');
// const create = require('./core/create');
// const utils = require('./core/utils');
// const logger = require('./core/logger');

// _.pascalCase = _.flow(
//   _.camelCase,
//   _.upperFirst
// );
// _.upperSnakeCase = _.flow(
//   _.snakeCase,
//   _.toUpper
// );

// global.rekit = {
//   core: {
//     app,
//     paths,
//     files,
//     plugin,
//     element,
//     vio,
//     template,
//     config,
//     refactor,
//     ast,
//     deps,
//     dependents,
//     handleCommand,
//     create,
//     utils,
//     logger,
//   },
// };

// module.exports = global.rekit;
