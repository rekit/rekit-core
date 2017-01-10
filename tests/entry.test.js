'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const helpers = require('./helpers');
const core = require('../core');

const vio = core.vio;
const utils = core.utils;
const entry = core.entry;

const expectFile = helpers.expectFile;
const expectFiles = helpers.expectFiles;
const expectNoFile = helpers.expectNoFile;
const expectNoFiles = helpers.expectNoFiles;
const expectLines = helpers.expectLines;
const expectNoLines = helpers.expectNoLines;
const TEST_FEATURE_NAME = helpers.TEST_FEATURE_NAME;

const mapFeatureFile = _.partial(utils.mapFeatureFile, TEST_FEATURE_NAME);
const mapTestFile = _.partial(utils.mapTestFile, TEST_FEATURE_NAME);

describe('cli: action tests', function() { // eslint-disable-line
  before(() => {
    vio.reset();
    core.addFeature(TEST_FEATURE_NAME);
  });

  // index.js
  it('addToIndex should add export from correctly', () => {
    entry.addToIndex(TEST_FEATURE_NAME, 'testEntry');
    expectLines(mapFeatureFile('index.js'), [
      "export testEntry from './testEntry';",
    ]);
  });

  it('renameInIndex should rename export from correctly', () => {
    entry.renameInIndex(TEST_FEATURE_NAME, 'testEntry', 'newName');
    expectNoLines(mapFeatureFile('index.js'), [
      "export testEntry from './testEntry';",
    ]);
    expectLines(mapFeatureFile('index.js'), [
      "export newName from './newName';",
    ]);
  });

  it('removeFromIndex should remove export from correctly', () => {
    entry.removeFromIndex(TEST_FEATURE_NAME, 'newName');
    expectNoLines(mapFeatureFile('index.js'), [
      "export newName from './newName';",
    ]);
  });

  // style.less
  it('addToStyle should add style import correctly', () => {
    entry.addToStyle(TEST_FEATURE_NAME, 'TestEntry');
    expectLines(mapFeatureFile('style.less'), [
      "@import './TestEntry.less';",
    ]);
  });

  it('renameInStyle should rename style import correctly', () => {
    entry.renameInStyle(TEST_FEATURE_NAME, 'TestEntry', 'newName');
    expectNoLines(mapFeatureFile('style.less'), [
      "@import './TestEntry.less';",
    ]);
    expectLines(mapFeatureFile('style.less'), [
      "@import './newName.less';",
    ]);
  });

  it('removeFromStyle should remove style import correctly', () => {
    entry.removeFromStyle(TEST_FEATURE_NAME, 'newName');
    expectNoLines(mapFeatureFile('style.less'), [
      "@import './newName.less';",
    ]);
  });
});
