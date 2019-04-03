/*
  Summary:
    Run specific tests
  Usage examples:
   - node runTests.js // run all tests
   - node runTests.js refactor.test.js // run refactor tests
*/

'use strict';

const path = require('path');
const { spawn } = require('child_process');

const prjRoot = path.join(__dirname, '../');

let testFile = process.argv[2];
let needReport = false;
if (!testFile) {
  needReport = true;
  testFile = path.join(prjRoot, 'tests/**/*.test.js');
} else {
  testFile = path.join(prjRoot, 'tests', testFile);
}
console.log('Running tests: ', testFile.replace(prjRoot, ''), '...');

const env = Object.create(process.env);
env.NODE_ENV = 'test';

const params = [
  'mocha',
  '--require',
  'tests/before-all.js',
  `${testFile}`,
  // "--exit"
];

if (needReport) {
  params.splice(0, 0, 'nyc', '--report-dir=coverage');
}
const opts = {
  cwd: prjRoot,
  stdio: 'inherit',
  env,
};
spawn('npx', params, opts);

if (needReport) {
  console.log('Report: ', path.join(prjRoot, 'coverage/lcov-report/index.html'));
}
