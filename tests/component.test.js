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

describe('cli: component tests', function() { // eslint-disable-line
  before(() => {
    vio.reset();
    core.addFeature(TEST_FEATURE_NAME);
  });

  it('throw error when no args to add component', () => {
    expect(core.addComponent).to.throw(Error);
  });

  it('throw error when no args to remove component', () => {
    expect(core.removeComponent).to.throw(Error);
  });

  it('add component', () => {
    core.addComponent(TEST_FEATURE_NAME, 'test-component');
    expectFiles([
      'TestComponent.js',
      'TestComponent.less',
    ].map(mapFeatureFile));
    expectLines(mapFeatureFile('style.less'), [
      '@import \'./TestComponent.less\';'
    ]);
    expectLines(mapFeatureFile('index.js'), [
      'export TestComponent from \'./TestComponent\';',
    ]);
    expectFiles([
      'TestComponent.test.js',
    ].map(mapTestFile));
  });

  it('throw error when component already exists', () => {
    expect(core.addComponent.bind(core, TEST_FEATURE_NAME, 'test-component')).to.throw();
  });

  it('remove component', () => {
    core.removeComponent(TEST_FEATURE_NAME, 'test-component');
    expectNoFiles([
      'TestComponent.js',
      'TestComponent.less',
    ].map(mapFeatureFile));
    expectNoLines(mapFeatureFile('style.less'), [
      '@import \'./TestComponent.less\';'
    ]);
    expectNoLines(mapFeatureFile('index.js'), [
      'import TestComponent from \'./TestComponent\';',
      '  TestComponent,',
    ]);
    expectNoFiles([
      'TestComponent.test.js',
    ].map(mapTestFile));
  });
});
