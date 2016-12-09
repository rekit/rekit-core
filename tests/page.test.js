'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const helpers = require('./helpers');
const core = require('../core');

const vio = core.vio;
const utils = core.utils;

const expectFiles = helpers.expectFiles;
const expectNoFiles = helpers.expectNoFiles;
const expectLines = helpers.expectLines;
const expectNoLines = helpers.expectNoLines;
const TEST_FEATURE_NAME = helpers.TEST_FEATURE_NAME;

const mapFeatureFile = _.partial(utils.mapFeatureFile, TEST_FEATURE_NAME);
const mapTestFile = _.partial(utils.mapTestFile, TEST_FEATURE_NAME);

describe('cli: page tests', function() { // eslint-disable-line
  before(() => {
    vio.reset();
    core.addFeature(TEST_FEATURE_NAME);
  });

  it('throw error when no args to add page', () => {
    expect(core.addPage).to.throw(Error);
  });

  it('throw error when no args to remove page', () => {
    expect(core.removePage).to.throw(Error);
  });

  it('add page', () => {
    core.addPage(TEST_FEATURE_NAME, 'test-page');
    expectFiles([
      'TestPage.js',
      'TestPage.less',
    ].map(mapFeatureFile));
    expectLines(mapFeatureFile('style.less'), [
      '@import \'./TestPage.less\';'
    ]);
    expectLines(mapFeatureFile('index.js'), [
      'export TestPage from \'./TestPage\';',
    ]);
    expectLines(mapFeatureFile('route.js'), [
      '    { path: \'test-page\', name: \'Test page\', component: TestPage },',
      '  TestPage,',
    ]);
  });

  it('throw error when component already exists', () => {
    expect(core.addPage.bind(core, TEST_FEATURE_NAME, 'test-page')).to.throw();
  });

  it('add page with url path', () => {
    core.addPage(TEST_FEATURE_NAME, 'test-page-2', { urlPath: 'test-path' });
    expectFiles([
      'TestPage2.js',
      'TestPage2.less',
    ].map(mapFeatureFile));
    expectLines(mapFeatureFile('style.less'), [
      '@import \'./TestPage2.less\';'
    ]);
    expectLines(mapFeatureFile('index.js'), [
      'export TestPage2 from \'./TestPage2\';',
    ]);
    expectLines(mapFeatureFile('route.js'), [
      '    { path: \'test-path\', name: \'Test page 2\', component: TestPage2 },',
      '  TestPage2,',
    ]);
  });

  it('remove page', () => {
    core.removePage(TEST_FEATURE_NAME, 'test-page');
    expectNoFiles([
      'TestPage.js',
      'TestPage.less',
    ].map(mapFeatureFile));
    expectNoLines(mapFeatureFile('style.less'), [
      '@import \'./TestPage.less\';'
    ]);
    expectNoLines(mapFeatureFile('index.js'), [
      'import TestPage from \'./TestPage\';',
      '  TestPage,',
    ]);
    expectNoLines(mapFeatureFile('route.js'), [
      '    { path: \'test-page\', component: TestPage },',
      '  TestPage,',
    ]);
    expectNoFiles([
      'TestPage.test.js',
    ].map(mapTestFile));
  });

  it('remove page with url path', () => {
    core.removePage(TEST_FEATURE_NAME, 'test-page-2');
    expectNoFiles([
      'TestPage2.js',
      'TestPage2.less',
    ].map(mapFeatureFile));
    expectNoLines(mapFeatureFile('style.less'), [
      '@import \'./TestPage2.less\';'
    ]);
    expectNoLines(mapFeatureFile('index.js'), [
      'import TestPage2 from \'./TestPage2\';',
      '  TestPage2,',
    ]);
    expectNoLines(mapFeatureFile('route.js'), [
      '    { path: \'test-path\', name: \'Test page 2\' component: TestPage2 },',
      '  TestPage2,',
    ]);
    expectNoFiles([
      'TestPage2.test.js',
    ].map(mapTestFile));
  });
});
