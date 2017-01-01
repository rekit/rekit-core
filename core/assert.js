'use strict';

const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const utils = require('./utils');
const vio = require('./vio');

function notEmpty(str, name) {
  if (!str) {
    utils.fatalError(name + ' should not be empty.');
  }
}

function featureExist(feature) {
  const p = path.join(utils.getProjectRoot(), 'src/features', _.kebabCase(feature));
  if (!shell.test('-e', p) && !vio.dirExists(p)) {
    utils.fatalError('Feature doesn\'t exist: ' + feature);
  }
}

function featureNotExist(feature) {
  const p = path.join(utils.getProjectRoot(), 'src/features', _.kebabCase(feature));
  if (shell.test('-e', p) || vio.dirExists(p)) {
    utils.fatalError('Feature doesn\'t exist: ' + feature);
  }
}

module.exports = {
  notEmpty,
  featureExist,
  featureNotExist,
};
