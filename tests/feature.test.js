'use strict';

const expect = require('chai').expect;
const _ = require('lodash');
const helpers = require('./helpers');
const core = require('../core');

const vio = core.vio;
const utils = core.utils;

const expectFiles = helpers.expectFiles;
const expectNoFile = helpers.expectNoFile;
const expectNoFiles = helpers.expectNoFiles;
const expectLines = helpers.expectLines;
const expectNoLines = helpers.expectNoLines;
const TEST_FEATURE_NAME = helpers.TEST_FEATURE_NAME;
const CAMEL_TEST_FEATURE_NAME = _.camelCase(TEST_FEATURE_NAME);

const mapFeatureFile = _.partial(utils.mapFeatureFile, TEST_FEATURE_NAME);
const mapTestFile = _.partial(utils.mapTestFile, TEST_FEATURE_NAME);

describe('cli: feature test', function() { // eslint-disable-line
  this.timeout(1000);

  before(() => {
    // To reset test env
    vio.reset();
  });

  it('throw error when no args to add feature', () => {
    expect(core.addFeature).to.throw(Error);
  });

  it('add test feature', () => {
    core.addFeature(TEST_FEATURE_NAME);
    expectFiles([
      'redux/actions.js',
      'redux/constants.js',
      'redux/reducer.js',
      'redux/initialState.js',
      'index.js',
      'route.js',
      'DefaultPage.js',
      'DefaultPage.less',
      'style.less',
    ].map(mapFeatureFile));
    expectLines(utils.mapSrcFile('common/rootReducer.js'), [
      `import ${CAMEL_TEST_FEATURE_NAME}Reducer from '../features/${TEST_FEATURE_NAME}/redux/reducer';`,
      `  ${CAMEL_TEST_FEATURE_NAME}: ${CAMEL_TEST_FEATURE_NAME}Reducer,`,
    ]);
    expectLines(utils.mapSrcFile('common/routeConfig.js'), [
      `import ${CAMEL_TEST_FEATURE_NAME}Route from '../features/${TEST_FEATURE_NAME}/route';`,
      `    ${CAMEL_TEST_FEATURE_NAME}Route,`,
    ]);
    expectLines(utils.mapSrcFile('styles/index.less'), [
      `@import '../features/${TEST_FEATURE_NAME}/style.less';`,
    ]);
    expectFiles([
      'redux/reducer.test.js',
    ].map(mapTestFile));
  });

  it('remove feature', () => {
    core.removeFeature(TEST_FEATURE_NAME);
    expectNoFile(utils.mapSrcFile('test'));
    expectNoLines(utils.mapSrcFile('common/rootReducer.js'), [
      CAMEL_TEST_FEATURE_NAME,
    ]);
    expectNoLines(utils.mapSrcFile('common/routeConfig.js'), [
      `${CAMEL_TEST_FEATURE_NAME}Route`,
    ]);
    expectNoLines(utils.mapSrcFile('styles/index.less'), [
      `@import '../features/${TEST_FEATURE_NAME}/style.less';`,
    ]);
    expectNoFiles([
      'redux/reducer.test.js',
    ].map(mapTestFile));
  });
});
