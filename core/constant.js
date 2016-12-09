'use strict';

const _ = require('lodash');
const utils = require('./utils');
const refactor = require('./refactor');
const vio = require('./vio');

function add(feature, name) {
  name = _.upperSnakeCase(name);
  const targetPath = utils.mapReduxFile(feature, 'constants');
  const lines = vio.getLines(targetPath);
  if (lines.length && !lines[lines.length - 1]) lines.pop();
  lines.push(`export const ${name} = '${name}';`);
  lines.push('');

  vio.save(targetPath, lines);
}

function remove(feature, name) {
  name = _.upperSnakeCase(name);
  const targetPath = utils.mapReduxFile(feature, 'constants');
  refactor.removeLines(targetPath, `export const ${name} = '${name}';`);
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

module.exports = {
  add,
  remove,
  rename,
};
