'use strict';
const expect = require('chai').expect;
const vio = require('../../core/vio');
const format = require('../../core/refactor/format');

describe('format code', function() {
  // eslint-disable-line
  before(() => {
    vio.reset();
  });

  const CODE = `var a="1";`;

  it(`rename the first matched variable`, () => {
    const newCode = format(CODE, __filename, { insertFinalNewline: false }).formatted;
    expect(newCode).to.equal("var a = '1';");
    const newCode2 = format(CODE, __filename, { singleQuote: false }).formatted;
    expect(newCode2).to.equal('var a = "1";\n');
  });
});
