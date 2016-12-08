'use strict';

const path = require('path');
const expect = require('chai').expect;
const utils = require('../core/utils');

describe('util tests', function() { // eslint-disable-line
  before(() => {

  });

  describe('getProjectRoot', () => {
    it('should get the first folder path with package.json in', () => {
      const prjRoot = utils.getProjectRoot();
      const expectedRoot = path.join(__dirname, '..');
      expect(prjRoot).to.equal(expectedRoot);
    });
  });
});

