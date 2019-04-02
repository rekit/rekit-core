'use strict';

const vio = require('../../core/vio');
const refactor = require('../../core/refactor');
const helpers = require('../helpers');

const V_FILE = 'vio-temp-file.js';

const expectLines = helpers.expectLines;

describe('importExport', function() {
  // eslint-disable-line
  before(() => {
    vio.reset();
  });

  const CODE0 = `\
// Test
import { /*abc */DefaultPage } from './'; // abc
`;

  it(`add import from`, () => {
    vio.put(V_FILE, CODE0);
    refactor.addImportFrom(V_FILE, './', '', 'ModuleName');

    expectLines(V_FILE, [`import { DefaultPage, ModuleName } from './'; // abc`]);
  });
});

describe('addImportFrom', () => {
  const CODE = `\
import A from './A';
import { C, D, Z } from './D';
import { E } from './E';
import F from './F';
import {
  G1,
  G2,
  G3,
} from './G';
import {
} from './';

const otherCode = 1;
  `;

  it('should add import line when no module source exist', () => {
    vio.put(V_FILE, CODE);
    refactor.addImportFrom(V_FILE, './K', 'K');
    refactor.addImportFrom(V_FILE, './L', 'L', 'L1');
    refactor.addImportFrom(V_FILE, './M', '', 'M1');
    refactor.addImportFrom(V_FILE, './N', 'N', ['N1', 'N2']);
    refactor.addImportFrom(V_FILE, './G', '', ['G4', 'G5']);
    refactor.addImportFrom(V_FILE, './', '', ['H1']);
    refactor.addImportFrom(V_FILE, './A', null, null, 'all');
    refactor.addImportFrom(V_FILE, './X', null, null, 'AllX');
    refactor.addImportFrom(V_FILE, './Y', 'Y');
    refactor.addImportFrom(V_FILE, './Z', 'Z');
    console.log(vio.getContent(V_FILE));
    expectLines(V_FILE, [
      "import K from './K';",
      // "import Y from './Y';",
      // "import Z from './Z';",
      // "import L, { L1 } from './L';",
      // "import { M1 } from './M';",
      // "import N, { N1, N2 } from './N';",
      // '  G4,',
      // '  G5,',
      // '  H1,',
      // "import A, * as all from './A';",
      // "import * as AllX from './X';",
    ]);
  });

  it('should add import when empty', () => {
    const code = `
import {
} from './';

export default {
  path: 'rekit-test-feature',
  name: 'Rekit test feature',
  childRoutes: [
    { path: 'default-page', name: 'Default page', component: DefaultPage, isIndex: true },
  ],
};
      `;
    vio.put(V_FILE, code);
    refactor.addImportFrom(V_FILE, './', '', 'A');
    expectLines(V_FILE, ['  A,']);
  });

  it('should add import specifier(s) when module exist', () => {
    vio.put(V_FILE, CODE);
    refactor.addImportFrom(V_FILE, './A', 'AA', 'A1');
    refactor.addImportFrom(V_FILE, './D', 'W', 'Y');
    refactor.addImportFrom(V_FILE, './E', '', ['E', 'E1']);
    refactor.addImportFrom(V_FILE, './F', 'F');
    expectLines(V_FILE, [
      "import A, { A1 } from './A';",
      "import W, { C, D, Z, Y } from './D';",
      "import { E, E1 } from './E';",
    ]);
  });
});

describe('addExportFrom', () => {
  const CODE = `\
export { default as A } from './A';
export { C, D, Z } from './D';
export { E } from './E';
export { default as F } from './F';

const otherCode = 1;
`;
  it('should add export line when no module source exist', () => {
    vio.put(V_FILE, CODE);
    refactor.addExportFrom(V_FILE, './K', 'K');
    refactor.addExportFrom(V_FILE, './L', 'L', 'L1');
    refactor.addExportFrom(V_FILE, './M', '', 'M1');
    refactor.addExportFrom(V_FILE, './N', 'N', ['N1', 'N2']);
    expectLines(V_FILE, [
      "export { default as K } from './K';",
      "export { default as L, L1 } from './L';",
      "export { M1 } from './M';",
      "export { default as N, N1, N2 } from './N';",
    ]);
  });

  it('should add export specifier(s) when module exist', () => {
    vio.put(V_FILE, CODE);
    refactor.addExportFrom(V_FILE, './A', 'AA', 'A1');
    refactor.addExportFrom(V_FILE, './D', 'W', 'Y');
    refactor.addExportFrom(V_FILE, './E', '', ['E', 'E1']);
    refactor.addExportFrom(V_FILE, './F', 'F');

    expectLines(V_FILE, [
      "export { default as A, A1 } from './A';",
      "export { default as W, C, D, Z, Y } from './D';",
      "export { E, E1 } from './E';",
    ]);
  });
});
