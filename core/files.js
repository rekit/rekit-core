const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const paths = require('./paths');
const config = require('./config');
const deps = require('./deps');
const chokidar = require('chokidar');
const EventEmitter = require('events');
const minimatch = require('minimatch');

const MAX_FILES = 3000;

let cache = {};
let parentHash = {};
let allElementById = {};
const byId = id => allElementById[id];

const watchers = {};

const files = new EventEmitter();

const emitChange = _.debounce(() => {
  files.emit('change');
}, 100);

function readDir(dir, args = {}) {
  if (args.force) {
    cache = {};
    parentHash = {};
    allElementById = {};
  }
  dir = dir || paths.map('src');
  if (!fs.existsSync(dir)) {
    return { elements: [], elementById: {}};
  }
  if (!watchers[dir]) startWatch(dir);
  if (!cache[dir]) {
    cache[dir] = getDirElement(dir);
  }
  const elementById = {};
  const dirEle = cache[dir];
  const children = [...dirEle.children];
  while (children.length) {
    // Get elementById
    const cid = children.pop();
    const ele = byId(cid);
    elementById[cid] = ele;
    if (ele.children) children.push(...ele.children);
  }
  // Always return a cloned object to avoid acidentally cache modify
  const res = JSON.parse(JSON.stringify({ elements: dirEle.children, elementById }));
  return res;
}

function startWatch(dir) {
  if (global.__REKIT_NO_WATCH) return;
  const w = chokidar.watch(dir, {
    persistent: true,
    ignored: /node_modules/,
    awaitWriteFinish: true,
  });
  w.on('ready', () => {
    w.on('add', onAdd);
    w.on('change', onChange);
    w.on('unlink', onUnlink);
    w.on('addDir', onAddDir);
    w.on('unlinkDir', onUnlinkDir);
  });
  watchers[dir] = w;
}

const setLastChangeTime = () => {
  files.lastChangeTime = Date.now();
};

function onAdd(file) {
  // console.log('on add', file);
  const prjRoot = paths.getProjectRoot();
  const rFile = file.replace(prjRoot, '');
  allElementById[rFile] = getFileElement(file);

  const dir = path.dirname(rFile);
  if (!byId(dir)) {
    onAddDir(dir);
  }
  const children = byId(dir).children;
  children.push(rFile);

  sortElements(byId(dir).children);

  setLastChangeTime();
  emitChange();
}
function onUnlink(file) {
  // console.log('on unlink', file);
  const prjRoot = paths.getProjectRoot();
  const rFile = file.replace(prjRoot, '');
  delete allElementById[rFile];

  const dir = path.dirname(rFile);
  _.pull(byId(dir).children, rFile);

  setLastChangeTime();
  emitChange();
}
function onChange(file) {
  // console.log('on change', file);
  const prjRoot = paths.getProjectRoot();
  const rFile = file.replace(prjRoot, '');
  allElementById[rFile] = getFileElement(file);

  setLastChangeTime();
  emitChange();
}
function onAddDir(file) {
  // console.log('on add dir', file);
  const prjRoot = paths.getProjectRoot();
  const rFile = file.replace(prjRoot, '');
  if (byId(rFile)) return; // already exists
  // suppose it's always empty, children will be added by other events
  allElementById[rFile] = {
    name: path.basename(file),
    type: 'folder',
    id: rFile,
    children: [],
  };
  const dir = path.dirname(rFile);
  if (!byId(dir)) {
    console.warn('files.onAddDir: dir not exists: ', file);
    return;
  }
  byId(dir).children.push(rFile);

  sortElements(byId(dir).children);
  setLastChangeTime();
  emitChange();
}
function onUnlinkDir(file) {
  // console.log('on unlink dir', file);
  onUnlink(file);

  setLastChangeTime();
  emitChange();
}

function getDirElement(dir) {
  const prjRoot = paths.getProjectRoot();
  let rDir = dir.replace(prjRoot, '');
  if (!rDir) rDir = '.'; // root dir
  const dirEle = {
    name: path.basename(dir),
    type: 'folder',
    id: rDir,
    children: [],
  };
  allElementById[rDir] = dirEle;

  // const allFiles = shell.ls('-A', dir);
  const exclude = [
    '**/node_modules',
    '**/.DS_Store',
    '**/.git',
    ...(config.getRekitConfig().exclude || []),
  ];
  const include = config.getRekitConfig().include || [];
  fs.readdirSync(dir)
    .map(name => path.join(dir, name))
    .filter(file => {
      const rFile = file.replace(prjRoot, '');
      return !exclude.some(p => minimatch(rFile, p)) || include.some(p => minimatch(rFile, p));
      // (path.basename(file) !== "node_modules" &&
      //   path.basename(file) !== ".DS_Store" &&
      //   !(
      //     path.basename(file).startsWith(".") &&
      //     fs.statSync(file).isDirectory()
      //   ) &&
      //     (config.getRekitConfig().exclude || []).some(p => minimatch(file))
      //   &&
      //   !_.includes(
      //     config.getRekitConfig().exclude || [],
      //     file.replace(prjRoot, "")
      //   )) ||
      // _.includes(
      //   config.getRekitConfig().include || [],
      //   file.replace(prjRoot, "")
      // )
    })
    .forEach(file => {
      const rFile = file.replace(prjRoot, '');
      dirEle.children.push(rFile);
      parentHash[rFile] = rDir;
      if (fs.statSync(file).isDirectory()) {
        getDirElement(file);
      } else {
        getFileElement(file);
      }
    });
  if (Object.keys(allElementById).length > MAX_FILES) {
    console.log(
      `Rekit does'nt support a project with too many files. The project contains ${
        Object.keys(allElementById).length
      } files, the max size is ${MAX_FILES}.`,
    );
    throw new Error('OVER_MAX_FILES');
  }

  sortElements(dirEle.children);

  return dirEle;
}

function getFileElement(file) {
  const prjRoot = paths.getProjectRoot();
  const rFile = file.replace(prjRoot, '');
  const ext = path.extname(file).replace('.', '');
  const size = fs.statSync(file).size;
  const fileEle = {
    name: path.basename(file),
    type: 'file',
    ext,
    size,
    id: rFile,
  };
  allElementById[rFile] = fileEle;
  const fileDeps = size < 50000 ? deps.getDeps(rFile) : null;
  if (fileDeps) {
    fileEle.views = [
      { key: 'diagram', name: 'Diagram' },
      {
        key: 'code',
        name: 'Code',
        target: rFile,
        isDefault: true,
      },
    ];
    fileEle.deps = fileDeps;
  }
  return fileEle;
}

function sortElements(elements) {
  elements.sort((a, b) => {
    a = byId(a);
    b = byId(b);
    if (!a || !b) {
      console.log('Error in sortElement'); // should not happen?
      return 0;
    }
    if (a.children && !b.children) return -1;
    else if (!a.children && b.children) return 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  return elements;
}

files.readDir = readDir;
files.getDirElement = getDirElement;
files.getFileElement = getFileElement;
// files.setFileChanged = setFileChanged;

module.exports = files;
