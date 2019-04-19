const fs = require('fs-extra');
const config = require('./config');

module.exports = {
  fatal(code, msg) {
    console.log('Fatal error: ', code, msg);
    const err = new Error(msg);
    err.code = code;
    throw err;
  },
  isDirectory(file) {
    return fs.statSync(file).isDirectory(file);
  },
  useYarn() {
    return fs.existsSync(config.map('yarn.lock'));
  },
  addNodePath(p) {
    // Add a path to NODE_PATH to find node_modules
    const delimiter = process.platform === 'win32' ? ';' : ':';

    const current = process.env.NODE_PATH;
    if (current) process.env.NODE_PATH = current + delimiter + p;
    else process.env.NODE_PATH = p;
    require('module').Module._initPaths();
  },
};
