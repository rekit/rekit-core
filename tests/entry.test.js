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

describe('entry tests', function() { // eslint-disable-line
  before(() => {
    vio.reset();
    core.addFeature(TEST_FEATURE_NAME);
  });

  describe('handles: index.js', () => {
    // index.js
    it('addToIndex should add export from correctly', () => {
      entry.addToIndex(TEST_FEATURE_NAME, 'testEntry');
      expectLines(mapFeatureFile('index.js'), [
        "export { default as testEntry } from './testEntry';",
      ]);
    });

    it('renameInIndex should rename export from correctly', () => {
      entry.renameInIndex(TEST_FEATURE_NAME, 'testEntry', 'newName');
      expectNoLines(mapFeatureFile('index.js'), [
        "export { default as testEntry } from './testEntry';",
      ]);
      expectLines(mapFeatureFile('index.js'), [
        "export { default as newName } from './newName';",
      ]);
    });

    it('removeFromIndex should remove export from correctly', () => {
      entry.removeFromIndex(TEST_FEATURE_NAME, 'newName');
      expectNoLines(mapFeatureFile('index.js'), [
        "export { default as newName } from './newName';",
      ]);
    });
  });

  describe('handles: redux/actions.js', () => {
    // redux/actions.js
    const targetPath = mapFeatureFile('redux/actions.js');
    it('addToActions should add export from correctly', () => {
      entry.addToActions(TEST_FEATURE_NAME, 'testAction');
      expectLines(targetPath, [
        "export { testAction } from './testAction';",
      ]);
    });

    it('renameInActions should rename export from correctly', () => {
      entry.renameInActions(TEST_FEATURE_NAME, 'testAction', 'newName');
      expectNoLines(targetPath, [
        "export { testAction } from './testAction';",
      ]);
      expectLines(targetPath, [
        "export { newName } from './newName';",
      ]);
    });

    it('removeFromActions should remove export from correctly', () => {
      entry.removeFromActions(TEST_FEATURE_NAME, 'newName');
      expectNoLines(targetPath, [
        "export { newName } from './newName';",
      ]);
    });
  });

  describe('handles: redux/reducer.js', () => {
    // redux/actions.js
    const targetPath = mapFeatureFile('redux/reducer.js');
    it('addToReducer should add export from correctly', () => {
      console.log(targetPath);
      console.log(vio.getContent(targetPath));
      // entry.addToReducer(TEST_FEATURE_NAME, 'testAction');
      // console.log(vio.getContent(targetPath));
      // expectLines(targetPath, [
      //   "export { reducer as testActionReducer } from './testAction';",
      // ]);
    });
  });

  describe('handles: style.less', () => {
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
});
