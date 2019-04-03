'use strict';

const vio = require('../../core/vio');
const refactor = require('../../core/refactor');
const expect = require('chai').expect;
const { expectLines, expectNoLines } = require('../helpers');
const V_FILE = 'vio-temp-file.js';

describe('object tests', function() {
  // eslint-disable-line
  before(() => {
    vio.reset();
  });

  it(`addObjectProperty`, () => {
    const CODE1 = `\
const initialState = {
  apiSchema: []
};`;
    vio.put(V_FILE, CODE1);
    refactor.addObjectProperty(V_FILE, 'initialState', 'doFetchPending', false);
    expect(vio.getContent(V_FILE)).to.equal(`\
const initialState = {
  apiSchema: [],
  doFetchPending: false
};`);
    const CODE2 = `\
const initialState = {
};`;
    vio.put(V_FILE, CODE2);
    refactor.addObjectProperty(V_FILE, 'initialState', 'doFetchPending', false);
    expect(vio.getContent(V_FILE)).to.equal(`\
const initialState = {
  doFetchPending: false,
};`);

    const CODE3 = `const initialState = {};`;
    vio.put(V_FILE, CODE3);
    refactor.addObjectProperty(V_FILE, 'initialState', 'doFetchPending', false);
    expect(vio.getContent(V_FILE)).to.equal(`const initialState = { doFetchPending: false };`);

    const CODE4 = `const initialState = { a: 1 };`;
    vio.put(V_FILE, CODE4);
    refactor.addObjectProperty(V_FILE, 'initialState', 'doFetchPending', false);
    expect(vio.getContent(V_FILE)).to.equal(
      `const initialState = { a: 1, doFetchPending: false };`,
    );

    const CODE5 = `const initialState = { a: 1, };`;
    vio.put(V_FILE, CODE5);
    refactor.addObjectProperty(V_FILE, 'initialState', 'doFetchPending', false);
    expect(vio.getContent(V_FILE)).to.equal(
      `const initialState = { a: 1, doFetchPending: false, };`,
    );
  });

  const CODE = `\
const obj = {
  p1: 1,
  p2: 2,
  p3: 'abc',
  p4: true,
};

const obj1 = {
};

const obj2 = { p: 1 };
const obj3 = {};
const obj4 = { p1: 1, p2: 2, p3: 3 };

const c = obj.p1;
`;
  it('addObjectProperty should add new property when not exist', () => {
    vio.put(V_FILE, CODE);
    refactor.addObjectProperty(V_FILE, 'obj', 'p5', 'true');
    expectLines(V_FILE, ['  p5: true,']);
  });

  it('addObjectProperty should not add new property when already exist', () => {
    vio.put(V_FILE, CODE);
    refactor.addObjectProperty(V_FILE, 'obj', 'p4', 'false');
    expectLines(V_FILE, ['  p4: true,']);
  });

  it('addObjectProperty should handle one line object declaration', () => {
    vio.put(V_FILE, CODE);
    refactor.addObjectProperty(V_FILE, 'obj2', 'p2', 'true');
    refactor.addObjectProperty(V_FILE, 'obj3', 'p', "'abc'");
    expectLines(V_FILE, ['const obj2 = { p: 1, p2: true };', "const obj3 = { p: 'abc' };"]);
  });

  it('setObjectProperty should set the new value', () => {
    vio.put(V_FILE, CODE);
    refactor.setObjectProperty(V_FILE, 'obj', 'p2', '345');
    expectLines(V_FILE, ['  p2: 345,']);
  });

  it('renameObjectProperty should rename property correctly', () => {
    vio.put(V_FILE, CODE);
    refactor.renameObjectProperty(V_FILE, 'obj', 'p1', 'n1');
    refactor.renameObjectProperty(V_FILE, 'obj2', 'p', 'n');
    expectLines(V_FILE, ['  n1: 1,', 'const obj2 = { n: 1 };']);
  });

  it('removeObjectProperty should rename property correctly', () => {
    vio.put(V_FILE, CODE);
    refactor.removeObjectProperty(V_FILE, 'obj', 'p1');
    refactor.removeObjectProperty(V_FILE, 'obj', 'p3');
    refactor.removeObjectProperty(V_FILE, 'obj4', 'p2');
    expectNoLines(V_FILE, ['  p1: 1,', "  p3: 'abc',"]);

    expectLines(V_FILE, ['const obj4 = { p1: 1, p3: 3 };']);

    refactor.removeObjectProperty(V_FILE, 'obj4', 'p1');

    expectLines(V_FILE, ['const obj4 = { p3: 3 };']);

    refactor.removeObjectProperty(V_FILE, 'obj4', 'p3');
    expectLines(V_FILE, ['const obj4 = { };']);
  });
});
