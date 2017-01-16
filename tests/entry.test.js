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
    const targetPath = mapFeatureFile('redux/reducer.js');
    it('addToReducer should import entry and insert to reducers array', () => {
      entry.addToReducer(TEST_FEATURE_NAME, 'testAction');
      expectLines(targetPath, [
        "import { reducer as testActionReducer } from './testAction';",
        '  testActionReducer,',
      ]);
    });
    it('renameInReducer should rename entry and rename in reducers array', () => {
      entry.renameInReducer(TEST_FEATURE_NAME, 'testAction', 'newAction');
      expectLines(targetPath, [
        "import { reducer as newActionReducer } from './newAction';",
        '  newActionReducer,',
      ]);
    });
    it('removeFromReducer should remove entry and remove from reducers array', () => {
      entry.removeFromReducer(TEST_FEATURE_NAME, 'testAction');
      expectNoLines(targetPath, [
        "import { reducer as testActionReducer } from './testAction';",
        '  testActionReducer,',
      ]);
    });
  });

  describe('handles: redux/initialState.js', () => {
    const targetPath = mapFeatureFile('redux/initialState.js');
    it('addToInitialState should add initial state property', () => {
      entry.addToInitialState(TEST_FEATURE_NAME, 'someState', 'false');
      expectLines(targetPath, [
        '  someState: false,',
      ]);
    });
    it('renameInInitialState should rename state name', () => {
      entry.renameInInitialState(TEST_FEATURE_NAME, 'someState', 'newState');
      expectLines(targetPath, [
        '  newState: false,',
      ]);
    });

    it('removeFromInitialState should remove the state property', () => {
      entry.removeFromInitialState(TEST_FEATURE_NAME, 'newState');
      expectNoLines(targetPath, [
        '  newState: false,',
      ]);
    });
  });

  describe('handles: common/rootReducer.js', () => {
    const targetPath = utils.mapSrcFile('common/rootReducer.js');

    it('addToRootReducer should import feature reducer and combine it', () => {
      vio.put(targetPath, `
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import homeReducer from '../features/home/redux/reducer';
import commonReducer from '../features/common/redux/reducer';

const reducerMap = {
  routing: routerReducer,
  home: homeReducer,
  common: commonReducer,
};

export default combineReducers(reducerMap);
    `);
      entry.addToRootReducer('new-feature');
      expectLines(targetPath, [
        "import newFeatureReducer from '../features/new-feature/redux/reducer';",
        '  newFeature: newFeatureReducer,',
      ]);
    });
    it('renameInRootReducer should rename entry and rename in reducers array', () => {
      entry.renameInRootReducer('new-feature', 'renamed-new-feature');
      expectLines(targetPath, [
        "import renamedNewFeatureReducer from '../features/renamed-new-feature/redux/reducer';",
        '  renamedNewFeature: renamedNewFeatureReducer,',
      ]);
    });
    it('removeFromRootReducer should rename entry and rename in reducers array', () => {
      entry.removeFromRootReducer('renamed-new-feature');
      expectNoLines(targetPath, [
        "import renamedNewFeatureReducer from '../features/renamed-new-feature/redux/reducer';",
        '  renamedNewFeature: renamedNewFeatureReducer,',
      ]);
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
