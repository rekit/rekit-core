'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const helpers = require('./helpers');
const core = require('../core');

const vio = core.vio;
const utils = core.utils;

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

  it('throw error when no args to add action', () => {
    expect(core.addAction).to.throw(Error);
  });

  it('throw error when no args to remove action', () => {
    expect(core.removeAction).to.throw(Error);
  });

  it('add sync action', () => {
    core.addAction(TEST_FEATURE_NAME, 'test-action');
    const actionType = core.utils.getActionType(TEST_FEATURE_NAME, 'test-action');
    expectLines(mapFeatureFile('redux/constants.js'), [
      `export const ${actionType} = '${actionType}';`,
    ]);
    expectLines(mapFeatureFile('redux/actions.js'), [
      'export { testAction } from \'./testAction\';',
    ]);
    expectFile(mapFeatureFile('redux/testAction.js'));
    expectFiles([
      'redux/testAction.test.js',
    ].map(mapTestFile));
  });

  it('remove sync action', () => {
    core.removeAction(TEST_FEATURE_NAME, 'test-action');
    const actionType = core.utils.getActionType(TEST_FEATURE_NAME, 'test-action');
    expectNoLines(mapFeatureFile('redux/constants.js'), [
      actionType,
    ]);
    expectNoLines(mapFeatureFile('redux/actions.js'), [
      'testAction',
    ]);
    expectNoFile(mapFeatureFile('redux/testAction.js'));
    expectNoFiles([
      'redux/testAction.test.js',
    ].map(mapTestFile));
  });

  // it('remove sync action with custom action type', () => {
  //   core.removeAction(TEST_FEATURE_NAME, 'test-action-2', 'my-action-type');
  //   expectNoLines(mapFeatureFile('redux/constants.js'), [
  //     'MY_ACTION_TYPE',
  //   ]);
  //   expectNoLines(mapFeatureFile('redux/actions.js'), [
  //     'testAction2',
  //   ]);
  //   expectNoFile(mapFeatureFile('redux/testAction2.js'));
  //   expectNoFiles([
  //     'redux/testAction2.test.js',
  //   ].map(mapTestFile));
  // });
});
