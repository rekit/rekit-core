'use strict';
const expect = require('chai').expect;
const vio = require('../../core/vio');
const ast = require('../../core/ast');
const generate = require('../../core/refactor/generate');

const V_FILE = 'vio-temp-file.js';

describe('generate code', function() {
  // eslint-disable-line
  before(() => {
    vio.reset();
  });

  const CODE = `var a="1";`;

  it(`rename the first matched variable`, () => {
    vio.put(V_FILE, CODE);
    const newCode = generate(ast.getAst(V_FILE), V_FILE);
    expect(newCode).to.equal("var a = '1';");
  });
});
