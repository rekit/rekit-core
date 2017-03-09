'use strict';

const expect = require('chai').expect;
const utils = require('../../core/utils');
const vio = require('../../core/vio');

describe('refactor common tests', function() { // eslint-disable-line
  before(() => {
    vio.reset();
  });

  it('isLocalModule', () => {
    utils.setPkgJson({
      babel: {
        plugins: [
          [
            'module-resolver',
            {
              alias: {
                src: './src',
              }
            }
          ]
        ],
      }
    });

    expect(utils.isLocalModule('../f-2/redux/actions')).to.be.true;
    expect(utils.isLocalModule('src/common/routeConfig')).to.be.true;
    expect(utils.isLocalModule('react')).to.be.false;
  });

  it('resolveModulePath', () => {
    utils.setPkgJson({
      babel: {
        plugins: [
          [
            'module-resolver',
            {
              alias: {
                src: './src',
              }
            }
          ]
        ],
      }
    });

    const file = utils.mapSrcFile('features/f-1/Test.js');
    const p1 = utils.resolveModulePath(file, '../f-2/redux/actions');
    const p2 = utils.resolveModulePath(file, 'src/common/routeConfig');
    const p3 = utils.resolveModulePath(file, './M1');
    const p4 = utils.resolveModulePath(file, 'react');
    const p5 = utils.resolveModulePath(file, '../f-3');
    expect(p1).to.equal(utils.mapSrcFile('features/f-2/redux/actions'));
    expect(p2).to.equal(utils.mapSrcFile('common/routeConfig'));
    expect(p3).to.equal(utils.mapSrcFile('features/f-1/M1'));
    expect(p4).to.equal('react');
    expect(p5).to.equal(utils.mapSrcFile('features/f-3/index'));
  });
});

