const path = require('path');
const os = require('os');
const _ = require('lodash');
const fs = require('fs-extra');

function join(...args) {
  // A consistent and normalized version of path.join cross platforms
  return path.normalize(path.join(...args)).replace(/\\/g, '/');
}

function normalize(p) {
  return path.normalize(p).replace(/\\/g, '/');
}

let projectRoot;
function setProjectRoot(prjRoot) {
  if (!path.isAbsolute(prjRoot)) prjRoot = path.join(process.cwd(), prjRoot);
  prjRoot = path.normalize(prjRoot).replace(/\\/g, '/');
  projectRoot = /\/$/.test(prjRoot) ? prjRoot : prjRoot + '/';
}

function getProjectRoot() {
  if (!projectRoot) {
    setProjectRoot(process.cwd());
  }
  return projectRoot;
}

function map() {
  const args = [getProjectRoot()];
  args.push.apply(args, arguments);
  return join.apply(null, args);
}

function relativePath(file) {
  if (!path.isAbsolute(file)) return file;
  return file.replace(/\\/g, '/').replace(getProjectRoot(), '');
}

function relative(from, to) {
  return path.relative(from, to).replace(/\\/g, '/');
}

// get the module source of 'to' from 'from' file.
// e.g: import to from '../to';
function relativeModuleSource(from, to) {
  const p = join(
    relative(path.dirname(from), path.dirname(to)),
    path.basename(to).replace(/\.\w+$/, ''),
  );

  if (!_.startsWith(p, '.')) return './' + p;
  return p;
}

function getFileId(filePath) {
  return filePath.replace(getProjectRoot()).replace(/^\/?/, '');
}

const rekitDir = path.join(os.homedir(), '.rekit');
function configFile(file) {
  return path.join(rekitDir, file);
}

const configPath = configFile;
fs.ensureDirSync(configPath('plugins')); // ensure plugins folder exists

module.exports = {
  join,
  map,
  getFileId,
  setProjectRoot,
  getProjectRoot,
  relative,
  normalize,
  rekitDir,
  configFile,
  configPath,
  relativePath,
  relativeModuleSource,
  getLocalPluginRoot: () => map('tools/plugins'),
};
