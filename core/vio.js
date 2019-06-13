'use strict';

// Virtual IO, create, update and delete files in memory until flush to the disk.
// NOTE: it only supports text files.

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const jsdiff = require('diff');
const paths = require('./paths');
const chalk = require('chalk');

// const prjRoot = paths.getProjectRoot();

let toSave = {};
let toDel = {};
let fileLines = {};
let dirs = {};
// let asts = {};
let mvs = {}; // Files to move
let mvDirs = {}; // Folders to move
// let failedToParse = {};

function printDiff(diff) {
  diff.forEach(line => {
    if (line.added) {
      line.value.split('\n').forEach(l => l && console.log(chalk.green(' +++ ') + chalk.gray(l)));
    } else if (line.removed) {
      line.value.split('\n').forEach(l => l && console.log(chalk.red(' --- ') + chalk.gray(l)));
    }
  });
}

function log(label, color, filePath, toFilePath) {
  const prjRoot = paths.getProjectRoot();
  const p = filePath.replace(prjRoot, '');
  const to = toFilePath ? toFilePath.replace(prjRoot, '') : '';
  console.log(chalk[color](label + p + (to ? ' to ' + to : '')));
}

// function mapPathAfterMvDir() {}
function getLines(filePath) {
  // if (path.isAbsolute(filePath)) throw new Error('Absolute file path is not allowed: ' + filePath);

  if (_.isArray(filePath)) {
    // If it's already lines, return the arg.
    return filePath;
  }

  if (!fileLines[filePath]) {
    // if the file is moved, find the real file path
    let realFilePath = _.findKey(mvs, s => s === filePath) || filePath;
    // if dir is moved, find the original file path
    Object.keys(mvDirs).forEach(oldDir => {
      if (_.startsWith(realFilePath, mvDirs[oldDir])) {
        realFilePath = realFilePath.replace(mvDirs[oldDir], oldDir);
      }
    });
    // console.log('real file path: ', Object.keys(fileLines), realFilePath);
    const absPath = path.isAbsolute(realFilePath) ? realFilePath : paths.map(realFilePath);
    if (!fs.existsSync(absPath)) {
      throw new Error("Can't find such file: " + realFilePath + '(' + absPath + ')');
    }
    const stat = fs.statSync(absPath);
    if (stat.size > 10000000) throw new Error('File size is too large to read.');
    fileLines[filePath] = fs
      .readFileSync(absPath)
      .toString()
      .split(/\r?\n/);
  }
  return fileLines[filePath];
}

function getContent(filePath) {
  return getLines(filePath).join('\n');
}

function fileExists(filePath) {
  let realPath = filePath;
  _.forOwn(mvDirs, (value, key) => {
    if (_.startsWith(filePath, value)) {
      realPath = filePath.replace(value, key);
      return false;
    }
    return true;
  });
  if (toDel[filePath]) return false;
  return (
    !!_.findKey(mvs, s => s === filePath) || // to be moved
    !!fileLines[filePath] ||
    !!toSave[filePath] ||
    fs.existsSync(path.isAbsolute(realPath) ? realPath : paths.map(realPath))
  );
}

function fileNotExists(filePath) {
  return !fileExists(filePath);
}

function dirExists(dir) {
  return (
    (!!dirs[dir] && !toDel[dir]) ||
    (fs.existsSync(paths.map(dir)) && fs.statSync(paths.map(dir)).isDirectory())
  );
}

function dirNotExists(dir) {
  return !dirExists(dir);
}

function ensurePathDir(fullPath) {
  const absPath = path.isAbsolute(fullPath) ? fullPath : paths.map(fullPath);
  fs.ensureDirSync(path.dirname(absPath));
}

function put(filePath, lines) {
  if (typeof lines === 'string') lines = lines.split(/\r?\n/);
  fileLines[filePath] = lines;
  // delete asts[filePath]; // ast needs to be updated
}

function mkdir(dir) {
  dirs[dir] = true;
}

function save(filePath, lines) {
  filePath = paths.relativePath(filePath);
  if (_.isString(lines) || _.isArray(lines)) {
    put(filePath, lines);
  }
  toSave[filePath] = true;
}

// function saveAst(filePath, ast) {
//   asts[filePath] = ast;
//   // Update file lines when ast is changed
//   save(filePath, generate(ast).code.split(/\r?\n/));
// }

function move(oldPath, newPath) {
  if (toDel[oldPath] || !fileExists(oldPath)) {
    log('Error: no file to move: ', 'red', oldPath);
    throw new Error('No file to move');
  }

  if (fileExists(newPath)) {
    log('Error: target file already exists: ', 'red', newPath);
    throw new Error('Target file already exists');
  }
  if (fileLines[oldPath]) {
    fileLines[newPath] = fileLines[oldPath];
    delete fileLines[oldPath];
  }

  // if (asts[oldPath]) {
  //   asts[newPath] = asts[oldPath];
  //   delete asts[oldPath];
  // }

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
  const updateKeys = obj => {
    _.keys(obj).forEach(key => {
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
  // updateKeys(asts);
  updateKeys(mvs);
  // updateKeys(failedToParse);

  const invertedMvs = _.invert(mvs);
  updateKeys(invertedMvs);
  mvs = _.invert(invertedMvs);

  mvDirs[oldPath] = newPath;
}

function ls(folder) {
  // Summary:
  //  List files of a folder, should contain both disk files and new created files in memory
  //  and it should consider mvDir

  let diskFiles = [];
  let realFolder = folder;
  if (!fs.existsSync(paths.map(realFolder))) {
    // it may be moved
    _.forOwn(mvDirs, (value, key) => {
      if (_.startsWith(folder, value)) {
        realFolder = folder.replace(value, key);
        return false;
      }
      return true;
    });
  }

  const isMovedOut = file => mvs[file] && !mvs[file].startsWith(realFolder);

  if (fs.existsSync(paths.map(realFolder))) {
    diskFiles = fs
      .readdirSync(paths.map(realFolder))
      .map(f => paths.join(folder, f))
      .filter(f => !toDel[f] && !isMovedOut(f));
  }
  console.log('real folder', realFolder, diskFiles);
  const memoFiles = Object.keys(toSave).filter(file => _.startsWith(file, folder) && !toDel[file]);
  return _.union(diskFiles, memoFiles);
}

function del(filePath, noWarning) {
  toDel[filePath] = noWarning ? 'no-warning' : true;
  delete toSave[filePath];
}

function reset() {
  toSave = {};
  toDel = {};
  fileLines = {};
  dirs = {};
  // asts = {};
  mvs = {};
  mvDirs = {};
}

function flush(args = {}) {
  const myLog = args.silent ? () => {} : log;
  const prjRoot = paths.getProjectRoot();
  const res = [];
  Object.keys(dirs).forEach(dir => {
    const absDir = paths.map(dir);
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir);
      log('Created: ', 'blue', dir);
      res.push({
        type: 'create-dir',
        file: dir,
      });
    }
  });

  // Move directories
  Object.keys(mvDirs).forEach(oldDir => {
    const absOldDir = paths.map(oldDir);
    if (!fs.existsSync(absOldDir)) {
      myLog('Warning: no dir to move: ', 'yellow', absOldDir);
      res.push({
        type: 'mv-file-warning',
        warning: 'no-file',
        file: oldDir,
      });
    } else {
      fs.renameSync(absOldDir, paths.map(mvDirs[oldDir]));
      myLog('Moved dir: ', 'green', oldDir, mvDirs[oldDir]);
      res.push({
        type: 'mv-file',
        file: oldDir,
      });
    }
  });

  // Delete files/folders
  Object.keys(toDel).forEach(filePath => {
    const absFilePath = paths.map(filePath);
    if (!fs.existsSync(absFilePath)) {
      if (toDel[filePath] !== 'no-warning') myLog('Warning: no file to delete: ', 'yellow', filePath);
      res.push({
        type: 'del-file-warning',
        warning: 'no-file',
        file: filePath,
      });
    } else {
      // fs.unlinkSync(absFilePath);
      fs.removeSync(absFilePath);
      myLog('Deleted: ', 'magenta', filePath);
      res.push({
        type: 'del-file',
        file: filePath,
      });
    }
  });

  // Move files
  Object.keys(mvs).forEach(filePath => {
    const absFilePath = paths.map(filePath);
    if (!fs.existsSync(absFilePath)) {
      myLog('Warning: no file to move: ', 'yellow', absFilePath);
      res.push({
        type: 'mv-file-warning',
        warning: 'no-file',
        file: filePath,
      });
    } else {
      ensurePathDir(paths.map(mvs[filePath]));
      fs.renameSync(absFilePath, paths.map(mvs[filePath]));
      myLog('Moved: ', 'green', filePath, mvs[filePath]);
      res.push({
        type: 'mv-file',
        file: filePath,
      });
    }
  });

  // Create/update files
  Object.keys(toSave).forEach(filePath => {
    const newContent = getLines(filePath).join('\n');
    const absFilePath = paths.map(filePath);
    if (fs.existsSync(absFilePath)) {
      const oldContent = fs
        .readFileSync(absFilePath)
        .toString()
        .split(/\r?\n/)
        .join('\n');
      if (oldContent === newContent) {
        return;
      }
      myLog('Updated: ', 'cyan', filePath);
      const diff = jsdiff.diffLines(oldContent, newContent);
      res.push({
        type: 'update-file',
        diff,
        file: filePath,
      });
      if (!args.silent) printDiff(diff);
    } else {
      ensurePathDir(filePath);
      myLog('Created: ', 'blue', filePath);
      res.push({
        type: 'create-file',
        file: filePath,
      });
    }
    fs.writeFileSync(absFilePath, newContent);
  });

  return res;
}

module.exports = {
  getLines,
  getContent,
  // getAst,
  // assertAst,
  // getFilesFailedToParse,
  // saveAst,
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
