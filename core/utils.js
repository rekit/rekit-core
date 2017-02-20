/* eslint no-console: 0 */

'use strict';

const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const colors = require('colors/safe');

let silent = false;

// NOTE: utils is just assumed to always be loaded before lodash is used...
_.pascalCase = _.flow(_.camelCase, _.upperFirst);
_.upperSnakeCase = _.flow(_.snakeCase, _.toUpper);

function setSilent(isSilent) {
  silent = isSilent;
}

function joinPath() {
  // A consistent and normalized version of path.join cross platforms
  return path.normalize(path.join.apply(path, arguments)).replace(/\\/g, '/');
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
  prjRoot = joinPath(prjRoot);
}

function getProjectRoot() {
  if (!prjRoot) {
    let cwd = process.cwd();
    let lastDir = null;
    // Traverse above until find the package.json.
    while (cwd && lastDir !== cwd) {
      const pkgPath = joinPath(cwd, 'package.json');
      if (shell.test('-e', pkgPath) && require(pkgPath).rekit) { // eslint-disable-line
        prjRoot = cwd;
        break;
      }
      lastDir = cwd;
      cwd = joinPath(cwd, '..');
    }
  }
  return joinPath(/\/$/.test(prjRoot) ? prjRoot : (prjRoot + '/'));
}

let pkgJson = null;
function getPkgJson() {
  // Get the project package json
  if (!pkgJson) {
    const pkgJsonPath = joinPath(getProjectRoot(), 'package.json');
    pkgJson = require(pkgJsonPath);
  }
  return pkgJson;
}

function setPkgJson(obj) {
  // Only used for unit test purpose
  pkgJson = obj;
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
  return regExp.test(relPath) ? relPath : joinPath(_prjRoot, relPath);
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
  return joinPath(getProjectRoot(), 'src', fileName);
}

function mapFeatureFile(feature, fileName) {
  return joinPath(getProjectRoot(), 'src/features', _.kebabCase(feature), fileName);
}

function mapTestFile(feature, fileName) {
  return joinPath(getProjectRoot(), 'tests/features', _.kebabCase(feature), fileName);
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
  return _.toArray(shell.ls(joinPath(getProjectRoot(), 'src/features')));
}

function getCssExt() {
  const pkgPath = joinPath(getProjectRoot(), 'package.json');
  const pkg = require(pkgPath); // eslint-disable-line
  return (pkg && pkg.rekit && pkg.rekit.css === 'sass') ? 'scss' : 'less';
}

function getFeatureName(filePath) {
  const relPath = getRelativePath(filePath);
  let name = null;

  if (_.startsWith(relPath, 'src/features')) {
    name = relPath.split('/')[2];
  }
  return name;
}

module.exports = {
  getCssExt,
  setProjectRoot,
  getProjectRoot,
  getPkgJson,
  setPkgJson,
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
  joinPath,
  getFeatures,
  fatalError,
  setSilent,
  log,
  warn,
  error,

  getFeatureName,
};
