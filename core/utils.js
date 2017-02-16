/* eslint no-console: 0 */

'use strict';

const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const colors = require('colors/safe');

let silent = false;

// NOTE: I just assume helpers is always loaded before lodash is used...
_.pascalCase = _.flow(_.camelCase, _.upperFirst);
_.upperSnakeCase = _.flow(_.snakeCase, _.toUpper);


function setSilent(isSilent) {
  silent = isSilent;
}

function log(msg) {
  if (!silent) console.log(msg);
}

function warn(msg) {
  if (!silent) console.log(colors.yellow('Warning: ' + msg));
}

function error(msg) {
  if (!silent) console.log(colors.red('Error: ' + msg));
}

function fatalError(msg) {
  error(msg);
  throw new Error(msg);
}

let prjRoot;

function setProjectRoot(root) {
  prjRoot = /\/$/.test(root) ? root : (root + '/');
}

function getProjectRoot() {
  if (!prjRoot) {
    let cwd = process.cwd();
    let lastDir = null;
    // Traverse above until find the package.json.
    while (cwd && lastDir !== cwd) {
      const pkgPath = path.join(cwd, 'package.json');
      if (shell.test('-e', pkgPath) && require(pkgPath).rekit) { // eslint-disable-line
        prjRoot = cwd;
        break;
      }
      lastDir = cwd;
      cwd = path.join(cwd, '..');
    }
  }
  return /\/$/.test(prjRoot) ? prjRoot : (prjRoot + '/');
}

function getRelativePath(fullPath) {
  // Get rel path relative to project root.
  const _prjRoot = getProjectRoot();
  const regExp = new RegExp(`^${_.escapeRegExp(_prjRoot)}`, 'i');
  return fullPath.replace(regExp, '');
}

function getFullPath(relPath) {
  const _prjRoot = getProjectRoot();
  const regExp = new RegExp(`^${_.escapeRegExp(_prjRoot)}`, 'i');
  return regExp.test(relPath) ? relPath : path.join(_prjRoot, relPath);
}

function getActionType(feature, action) {
  return `${_.upperSnakeCase(feature)}_${_.upperSnakeCase(action)}`;
}

function getAsyncActionTypes(feature, action) {
  return {
    normal: getActionType(feature, action),
    begin: `${_.upperSnakeCase(feature)}_${_.upperSnakeCase(action)}_BEGIN`,
    success: `${_.upperSnakeCase(feature)}_${_.upperSnakeCase(action)}_SUCCESS`,
    failure: `${_.upperSnakeCase(feature)}_${_.upperSnakeCase(action)}_FAILURE`,
    dismissError: `${_.upperSnakeCase(feature)}_${_.upperSnakeCase(action)}_DISMISS_ERROR`,
  };
}

function mapSrcFile(fileName) {
  return path.join(getProjectRoot(), 'src', fileName);
}

function mapFeatureFile(feature, fileName) {
  return path.join(getProjectRoot(), 'src/features', _.kebabCase(feature), fileName);
}

function mapTestFile(feature, fileName) {
  return path.join(getProjectRoot(), 'tests/features', _.kebabCase(feature), fileName);
}

function mapComponent(feature, name) {
  // Map a component, page name to the file.
  return mapFeatureFile(feature, _.pascalCase(name));
}

function mapReduxFile(feature, name) {
  return mapFeatureFile(feature, 'redux/' + _.camelCase(name) + '.js');
}

function mapReduxTestFile(feature, name) {
  return mapTestFile(feature, 'redux/' + _.camelCase(name) + '.test.js');
}

function mapComponentTestFile(feature, name) {
  return mapTestFile(feature, _.pascalCase(name) + '.test.js');
}

function getFeatures() {
  return _.toArray(shell.ls(path.join(getProjectRoot(), 'src/features')));
}

function getCssExt() {
  const pkgPath = path.join(getProjectRoot(), 'package.json');
  const pkg = require(pkgPath); // eslint-disable-line
  return (pkg && pkg.rekit && pkg.rekit.css === 'sass') ? 'scss' : 'less';
}

function isLocalModule(modulePath) {
  // TODO: handle alias module path like src
  return /^\./.test(modulePath);
}

function resolveModulePath(relativeToFile, modulePath) {
  // TODO: handle alias module path
  return path.resolve(path.dirname(relativeToFile), modulePath);
}

function getFeatureName(filePath) {
  return filePath.replace(getProjectRoot() + '/', '').split('/')[2];
}

module.exports = {
  getCssExt,
  setProjectRoot,
  getProjectRoot,
  getRelativePath,
  getFullPath,
  getActionType,
  getAsyncActionTypes,
  mapSrcFile,
  mapComponent,
  mapReduxFile,
  mapReduxTestFile,
  mapFeatureFile,
  mapTestFile,
  mapComponentTestFile,
  getFeatures,
  fatalError,
  setSilent,
  log,
  warn,
  error,

  isLocalModule,
  resolveModulePath,
  getFeatureName,
};
