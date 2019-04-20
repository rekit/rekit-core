'use strict';

const expect = require('chai').expect;
const paths = require('../../core/paths');
const vio = require('../../core/vio');
const refactorCommon = require('../../core/refactor/common');

describe('refactor common tests', function() {
  // eslint-disable-line

  before(() => {
    vio.reset();
  });

  it('isLocalModule', () => {
    expect(refactorCommon.isLocalModule('../f-2/redux/actions')).to.be.true;
    expect(refactorCommon.isLocalModule('src/common/routeConfig')).to.be.true;
    expect(refactorCommon.isLocalModule('src2/common/routeConfig')).to.be.false;
    expect(refactorCommon.isLocalModule('react')).to.be.false;
  });

  it('resolveModulePath', () => {
    const file = paths.map('src/features/f-1/Test.js');
    const p1 = refactorCommon.resolveModulePath(file, '../f-2/redux/actions');
    const p2 = refactorCommon.resolveModulePath(file, 'src/common/routeConfig');
    const p22 = refactorCommon.resolveModulePath(file, 'src/common/routeConfig.js');
    const p3 = refactorCommon.resolveModulePath(file, './M1');
    const p4 = refactorCommon.resolveModulePath(file, 'react');
    const p5 = refactorCommon.resolveModulePath(file, 'src/common');
    expect(p1).to.equal('src/features/f-2/redux/actions');
    expect(p2).to.equal('src/common/routeConfig');
    expect(p22).to.equal('src/common/routeConfig.js');
    expect(p3).to.equal('src/features/f-1/M1');
    expect(p4).to.equal('react');
    expect(p5).to.equal('src/common/index');
  });
});
