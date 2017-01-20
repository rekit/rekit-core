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
const TEST_FEATURE_NAME_2 = helpers.TEST_FEATURE_NAME_2;
const CAMEL_TEST_FEATURE_NAME = _.camelCase(TEST_FEATURE_NAME);
const CAMEL_TEST_FEATURE_NAME_2 = _.camelCase(TEST_FEATURE_NAME_2);

const mapFeatureFile = _.partial(utils.mapFeatureFile, TEST_FEATURE_NAME);
const mapFeatureFile2 = _.partial(utils.mapFeatureFile, TEST_FEATURE_NAME_2);
const mapTestFile = _.partial(utils.mapTestFile, TEST_FEATURE_NAME);
const mapTestFile2 = _.partial(utils.mapTestFile, TEST_FEATURE_NAME_2);
const mapSrcFile = utils.mapSrcFile;

describe('feature', function() { // eslint-disable-line

  before(() => {
    // To reset test env
    vio.reset();
    vio.put(mapSrcFile('common/rootReducer.js'), `

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
    vio.put(mapSrcFile('common/routeConfig.js'), `
import App from '../containers/App';
import { PageNotFound } from '../features/common';
import homeRoute from '../features/home/route';
import commonRoute from '../features/common/route';

// NOTE: DO NOT CHANGE the 'childRoutes' name and the declaration pattern.
// This is used for Rekit cmds to register routes config for new features, and remove config when remove features, etc.
const childRoutes = [
  homeRoute,
  commonRoute,
];

const routes = [{
  path: '/',
  component: App,
  childRoutes: [
    ...childRoutes,
    { path: '*', name: 'Page not found', component: PageNotFound },
  ].filter(r => r.component || (r.childRoutes && r.childRoutes.length > 0)),
}];

export default routes;
    `);
    vio.put(mapSrcFile('styles/index.less'), `
// index.less is the entry for all styles.
@import './reset.css';
@import './global.less';
@import '../containers/style.less';
@import '../features/home/style.less';
@import '../features/common/style.less';
    `);
  });

  it('throw error when no args to add feature', () => {
    expect(core.addFeature).to.throw(Error);
  });

  it('add feature', () => {
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

    expectLines(mapSrcFile('common/rootReducer.js'), [
      `import ${CAMEL_TEST_FEATURE_NAME}Reducer from '../features/${TEST_FEATURE_NAME}/redux/reducer';`,
      `  ${CAMEL_TEST_FEATURE_NAME}: ${CAMEL_TEST_FEATURE_NAME}Reducer,`,
    ]);
    expectLines(mapSrcFile('common/routeConfig.js'), [
      `import ${CAMEL_TEST_FEATURE_NAME}Route from '../features/${TEST_FEATURE_NAME}/route';`,
      `  ${CAMEL_TEST_FEATURE_NAME}Route,`,
    ]);
    expectLines(mapSrcFile('styles/index.less'), [
      `@import '../features/${TEST_FEATURE_NAME}/style.less';`,
    ]);
    expectFiles([
      'redux/reducer.test.js',
    ].map(mapTestFile));
  });

  it('rename feature', () => {
    // core.moveFeature(TEST_FEATURE_NAME, TEST_FEATURE_NAME_2);
  });

  it('remove feature', () => {
    core.removeFeature(TEST_FEATURE_NAME);
    expectNoFile(mapFeatureFile(''));
    expectNoFile(mapTestFile(''));
    expectNoLines(mapSrcFile('common/rootReducer.js'), [
      CAMEL_TEST_FEATURE_NAME,
    ]);
    expectNoLines(mapSrcFile('common/routeConfig.js'), [
      `${CAMEL_TEST_FEATURE_NAME}Route`,
    ]);
    expectNoLines(mapSrcFile('styles/index.less'), [
      `@import '../features/${TEST_FEATURE_NAME}/style.less';`,
    ]);
  });
});
