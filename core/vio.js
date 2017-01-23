'use strict';

// Virtual IO, create, update and delete files in memory until flush to the disk.
// NOTE: it only supports text files.

const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const jsdiff = require('diff');
const colors = require('colors/safe');
const babylon = require('babylon');
const generate = require('babel-generator').default;
const utils = require('./utils');

const prjRoot = utils.getProjectRoot();

let toSave = {};
let toDel = {};
let fileLines = {};
let dirs = {};
let asts = {};
let mvs = {}; // Files to move
let mvDirs = {}; // Folders to move

function printDiff(diff) {
  diff.forEach((line) => {
    if (line.added) {
      line.value.split('\n').forEach(l => l && console.log(colors.green(' +++ ') + colors.gray(l)));
    } else if (line.removed) {
      line.value.split('\n').forEach(l => l && console.log(colors.red(' --- ') + colors.gray(l)));
    }
  });
}

function log(label, color, filePath, toFilePath) {
  const p = filePath.replace(prjRoot, '');
  const to = toFilePath ? toFilePath.replace(prjRoot, '') : '';
  console.log(colors[color](label + p + (to ? (' to ' + to) : '')));
}

function getLines(filePath) {
  if (_.isArray(filePath)) {
    // If it's already lines, return the arg.
    return filePath;
  }

  if (!fileLines[filePath]) {
    // if the file is moved, find the real file path
    const realFilePath = _.findKey(mvs, s => s === filePath) || filePath;
    if (!shell.test('-e', realFilePath)) {
      utils.fatalError('Can\'t find such file: ' + realFilePath);
    }
    fileLines[filePath] = shell.cat(realFilePath).split(/\r?\n/);
  }
  return fileLines[filePath];
}

function getContent(filePath) {
  return getLines(filePath).join('\n');
}

function getAst(filePath) {
  if (!asts[filePath]) {
    const code = getLines(filePath).join('\n');
    try {
      const ast = babylon.parse(code, {
        // parse in strict mode and allow module declarations
        sourceType: 'module',
        plugins: [
          'jsx',
          'flow',
          'doExpressions',
          'objectRestSpread',
          'decorators',
          'classProperties',
          'exportExtensions',
          'asyncGenerators',
          'functionBind',
          'functionSent',
          'dynamicImport',
        ]
      });
      if (!ast) utils.fatalError(`Error: failed to parse ${filePath}, please check syntax.`);
      asts[filePath] = ast;
      ast._filePath = filePath;
    } catch (e) {
      utils.fatalError(`Error: failed to parse ${filePath}, please check syntax.`);
    }
  }
  return asts[filePath];
}

function fileExists(filePath) {
  return (!!fileLines[filePath] || !!toSave[filePath]) && !toDel[filePath] || shell.test('-e', filePath);
}

function fileNotExists(filePath) {
  return !fileExists(filePath);
}

function dirExists(dir) {
  return !!dirs[dir] && !toDel[dir] || shell.test('-e', dir);
}

function dirNotExists(dir) {
  return !dirExists(dir);
}

function ensurePathDir(fullPath) {
  if (!shell.test('-e', path.dirname(fullPath))) {
    shell.mkdir('-p', path.dirname(fullPath));
  }
}

function put(filePath, lines) {
  if (typeof lines === 'string') lines = lines.split(/\r?\n/);
  fileLines[filePath] = lines;
  delete asts[filePath]; // ast needs to be updated
}

function mkdir(dir) {
  dirs[dir] = true;
}

function save(filePath, lines) {
  if (_.isString(lines) || _.isArray(lines)) {
    put(filePath, lines);
  }
  toSave[filePath] = true;
}

function saveAst(filePath, ast) {
  asts[filePath] = ast;
  // Update file lines when ast is changed
  save(filePath, generate(ast).code.split(/\r?\n/));
}

function move(oldPath, newPath) {
  if (toDel[oldPath] || (!fileExists(oldPath) && !shell.test('-e', oldPath))) {
    log('Error: no file to move: ', 'red', oldPath);
    throw new Error('No file to move');
  }

  if (shell.test('-e', newPath) || fileExists(newPath)) {
    log('Error: target file already exists: ', 'red', newPath);
    throw new Error('Target file already exists');
  }

  if (fileLines[oldPath]) {
    fileLines[newPath] = fileLines[oldPath];
    delete fileLines[oldPath];
  }

  if (asts[oldPath]) {
    asts[newPath] = asts[oldPath];
    delete asts[oldPath];
  }

  if (toSave[oldPath]) {
    toSave[newPath] = true;
    delete toSave[oldPath];
  }

  if (toDel[oldPath]) {
    delete toDel[oldPath];
  }
  // if the file has already been moved
  oldPath = _.findKey(mvs, s => s === oldPath) || oldPath;
  mvs[oldPath] = newPath;
}

function moveDir(oldPath, newPath) {
  const updateKeys = (obj) => {
    _.keys(obj).forEach((key) => {
      if (_.startsWith(key, oldPath)) {
        const value = obj[key];
        delete obj[key];
        const newKey = newPath + key.slice(oldPath.length);
        obj[newKey] = value;
      }
    });
  };

  updateKeys(toSave);
  updateKeys(toDel);
  updateKeys(fileLines);
  updateKeys(dirs);
  updateKeys(asts);
  updateKeys(mvs);

  const invertedMvs = _.invert(mvs);
  updateKeys(invertedMvs);
  mvs = _.invert(invertedMvs);

  mvDirs[oldPath] = newPath;
}

function ls(folder) {
  let diskFiles = [];
  if (shell.test('-e', folder)) {
    diskFiles = shell.ls(folder).map(f => path.join(folder, f));
  }
  const memoFiles = Object.keys(toSave).filter(file => _.startsWith(file, folder) && !toDel[file]);
  return _.union(diskFiles, memoFiles);
}

function del(filePath) {
  toDel[filePath] = true;
}

function reset() {
  toSave = {};
  toDel = {};
  fileLines = {};
  dirs = {};
  asts = {};
  mvs = {};
  mvDirs = {};
}

function flush() {
  const res = [];
  Object.keys(dirs).forEach((dir) => {
    if (!shell.test('-e', dir)) {
      shell.mkdir('-p', dir);
      log('Created: ', 'blue', dir);
      res.push({
        type: 'create-dir',
        file: dir.replace(prjRoot, ''),
      });
    }
  });

  // Delete files first
  Object.keys(toDel).forEach((filePath) => {
    if (!shell.test('-e', filePath)) {
      log('Warning: no file to delete: ', 'yellow', filePath);
      res.push({
        type: 'del-file-warning',
        warning: 'no-file',
        file: filePath.replace(prjRoot, ''),
      });
    } else {
      shell.rm('-rf', filePath);
      log('Deleted: ', 'magenta', filePath);
      res.push({
        type: 'del-file',
        file: filePath.replace(prjRoot, ''),
      });
    }
  });

  // Move files
  Object.keys(mvs).forEach((filePath) => {
    if (!shell.test('-e', filePath)) {
      log('Warning: no file to move: ', 'yellow', filePath);
      res.push({
        type: 'mv-file-warning',
        warning: 'no-file',
        file: filePath.replace(prjRoot, ''),
      });
    } else {
      shell.mv(filePath, mvs[filePath]);
      log('Moved: ', 'green', filePath, mvs[filePath]);
      res.push({
        type: 'mv-file',
        file: filePath.replace(prjRoot, ''),
      });
    }
  });

  // Create/update files
  Object.keys(toSave).forEach((filePath) => {
    const newContent = getLines(filePath).join('\n');
    if (shell.test('-e', filePath)) {
      const oldContent = shell.cat(filePath).split(/\r?\n/).join('\n');
      if (oldContent === newContent) {
        log('Warning: nothing is changed for: ', 'yellow', filePath);
        res.push({
          type: 'update-file-warning',
          warning: 'no-change',
          file: filePath.replace(prjRoot, ''),
        });
        return;
      }
      log('Updated: ', 'cyan', filePath);
      const diff = jsdiff.diffLines(oldContent, newContent);
      res.push({
        type: 'update-file',
        diff,
        file: filePath.replace(prjRoot, ''),
      });
      printDiff(diff);
    } else {
      ensurePathDir(filePath);
      log('Created: ', 'blue', filePath);
      res.push({
        type: 'create-file',
        file: filePath.replace(prjRoot, ''),
      });
    }
    shell.ShellString(newContent).to(filePath);
  });

  return res;
}

module.exports = {
  getLines,
  getContent,
  getAst,
  saveAst,
  fileExists,
  fileNotExists,
  dirExists,
  dirNotExists,
  ensurePathDir,
  put,
  mkdir,
  moveDir,
  save,
  move,
  del,
  reset,
  log,
  flush,
  ls,
};
