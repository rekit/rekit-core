'use strict';

const vio = require('../../core/vio');
const refactor = require('../../core/refactor');
const helpers = require('../helpers');

const V_FILE = 'vio-temp-file.js';

const expectLines = helpers.expectLines;

describe('refactor string tests', function() {
  // eslint-disable-line
  before(() => {
    vio.reset();
  });

  const CODE = `\
import A from './src/A';
const s1 = 'abcde';
const s2 = 'ghijk';
    `;

  it('renameStringLiteral', () => {
    vio.put(V_FILE, CODE);
    refactor.renameStringLiteral(V_FILE, './src/A', './src/B');
    refactor.renameStringLiteral(V_FILE, 'abcde', '12345');
    expectLines(V_FILE, ["const s1 = '12345';", "import A from './src/B';"]);
  });
  it('replaceStringLiteral', () => {
    vio.put(V_FILE, CODE);
    refactor.replaceStringLiteral(V_FILE, 'hij', '234', false);
    expectLines(V_FILE, ["const s2 = 'g234k';"]);
  });

  const CODE2 = `
const str1 = 'abcdefg';
const jsx = (
  <div className="div1">
    <h2 className="sub-title-2">sub-title</h2>
  </div>
);

`;
  it('should only replace full string when fullMatch === true', () => {
    vio.put(V_FILE, CODE2);
    refactor.replaceStringLiteral(V_FILE, 'abcdefg', 'new-str');
    expectLines(V_FILE, ["const str1 = 'new-str';"]);
    refactor.replaceStringLiteral(V_FILE, 'new', 'xxx');
    expectLines(V_FILE, ["const str1 = 'new-str';"]);
  });

  it('should only replace full string when fullMatch === false', () => {
    vio.put(V_FILE, CODE2);
    refactor.replaceStringLiteral(V_FILE, 'sub-title', 'second-title', false);
    expectLines(V_FILE, ['    <h2 className="second-title-2">sub-title</h2>']);
  });
});
