'use strict';

const _ = require('lodash');
const utils = require('./utils');
const refactor = require('./refactor');
const vio = require('./vio');

function add(feature, name) {
  name = _.upperSnakeCase(name);
  const targetPath = utils.mapReduxFile(feature, 'constants');
  const lines = vio.getLines(targetPath);
  const i = refactor.lastLineIndex(lines, /^export /);
  lines.splice(i + 1, 0, `export const ${name} = '${name}';`);
  vio.save(targetPath, lines);
}

function rename(feature, oldName, newName) {
  oldName = _.upperSnakeCase(oldName);
  newName = _.upperSnakeCase(newName);

  const targetPath = utils.mapReduxFile(feature, 'constants');
  const lines = vio.getLines(targetPath);
  const i = refactor.lineIndex(lines, `export const ${oldName} = '${oldName}';`);
  if (i >= 0) {
    lines[i] = `export const ${newName} = '${newName}';`;
  }

  vio.save(targetPath, lines);
}

function remove(feature, name) {
  name = _.upperSnakeCase(name);
  const targetPath = utils.mapReduxFile(feature, 'constants');
  refactor.removeLines(targetPath, `export const ${name} = '${name}';`);
}

module.exports = {
  add,
  remove,
  rename,
};
