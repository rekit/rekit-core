/*
  Summary:
    Run specific tests
  Usage examples:
   - node run_test.js // run all tests
   - node run_test.js refactor.test.js // run refactor tests
*/

'use strict';
const path = require('path');
const shell = require('shelljs');
const npmRun = require('npm-run');

const prjRoot = path.join(__dirname, '../');

let testFile = process.argv[2];
let needReport = false;
if (!testFile) {
  needReport = true;
  testFile = path.join(prjRoot, 'tests/**/*.test.js');
} else {
  testFile = path.join(prjRoot, 'tests', testFile);
}
console.log(prjRoot);
console.log('Running tests: ', testFile.replace(prjRoot, ''), '...');

const env = Object.create(process.env);
env.NODE_ENV = 'test';

const opts = {
  cwd: prjRoot,
  stdio: 'inherit',
  env,
};

const params = ['mocha', testFile];

if (needReport) {
  params.splice(0, 0,
    'nyc',
    '--report-dir=coverage'
  );
}
npmRun.execSync(params.join(' '), opts);


// function runAllTest() {
//   const coverageFolder = path.join(prjRoot, 'coverage');
//   if (!shell.test('-e', coverageFolder)) {
//     shell.mkdir(coverageFolder);
//   }
//   const cacheFolder = path.join(coverageFolder, '.nyc_output');
//   if (shell.test('-e', cacheFolder)) {
//     shell.rm('-rf', cacheFolder);
//   }
//   shell.mkdir(cacheFolder);
//   runAppTest();
//   shell.cp('-R', path.join(prjRoot, '.nyc_output/*'), cacheFolder);
//   runCliTest();
//   shell.cp('-R', `${cacheFolder}/*`, path.join(prjRoot, '.nyc_output'));
//   npmRun.execSync('nyc report --reporter=text-summary --reporter=lcov', opts);
//   console.log('Overall coverage report: ', path.join(prjRoot, 'coverage/lcov-report/index.html'));
//   shell.rm('-rf', cacheFolder);
// }

// if (/^app/.test(args)) {
//   runAppTest();
// } else if (/^cli/.test(args)) {
//   runCliTest();
// } else if (/^all/.test(args)) {
//   runAllTest();
// } else {
//   console.error('Test files should be under test/app or test/cli.');
//   process.exit(1);
// }
