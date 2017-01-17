'use strict';

const _ = require('lodash');
const helpers = require('./helpers');
const core = require('../core');

const vio = core.vio;
const utils = core.utils;
const route = core.route;

const expectLines = helpers.expectLines;
const expectNoLines = helpers.expectNoLines;
const TEST_FEATURE_NAME = helpers.TEST_FEATURE_NAME;

const mapFeatureFile = _.partial(utils.mapFeatureFile, TEST_FEATURE_NAME);

describe('route', function() { // eslint-disable-line
  const targetPath = mapFeatureFile('route.js');
  before(() => {
    vio.reset();
    core.addFeature(TEST_FEATURE_NAME);
  });

  it('add route for a component with custom url path', () => {
    route.add(TEST_FEATURE_NAME, 'test-component', { urlPath: 'my-url' });
    console.log(vio.getContent(targetPath));
    expectLines(targetPath, [
      "  TestComponent,",
      "    { path: 'my-url', name: 'Test component', component: TestComponent },",
    ]);
  });

  // it('rename constant rename constant name and value', () => {
  //   constant.rename(TEST_FEATURE_NAME, 'CONST_1', 'NEW_CONST_1');
  //   expectNoLines(targetPath, [
  //     "export const CONST_1 = 'CONST_1';",
  //   ]);
  //   expectLines(targetPath, [
  //     "export const NEW_CONST_1 = 'NEW_CONST_1';",
  //   ]);
  // });

  // it('remove constant removes constant line', () => {
  //   constant.remove(TEST_FEATURE_NAME, 'NEW_CONST_1');
  //   expectNoLines(targetPath, [
  //     "export const NEW_CONST_1 = 'NEW_CONST_1';",
  //   ]);
  // });
});
