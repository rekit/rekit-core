'use strict';

const vio = require('../../core/vio');
const importExport = require('../../core/refactor/importExport');
const helpers = require('../helpers');

const V_FILE = 'vio-temp-file.js';

const expectLines = helpers.expectLines;
const expectNoLines = helpers.expectNoLines;

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
    importExport.addImportFrom(V_FILE, './', '', 'ModuleName');

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
    importExport.addImportFrom(V_FILE, './K', 'K');
    importExport.addImportFrom(V_FILE, './L', 'L', 'L1');
    importExport.addImportFrom(V_FILE, './M', '', 'M1');
    importExport.addImportFrom(V_FILE, './N', 'N', ['N1', 'N2']);
    importExport.addImportFrom(V_FILE, './G', '', ['G4', 'G5']);
    importExport.addImportFrom(V_FILE, './', '', ['H1']);
    importExport.addImportFrom(V_FILE, './A', null, null, 'all');
    importExport.addImportFrom(V_FILE, './X', null, null, 'AllX');
    importExport.addImportFrom(V_FILE, './Y', 'Y');
    importExport.addImportFrom(V_FILE, './Z', 'Z');

    expectLines(V_FILE, [
      "import K from './K';",
      "import Y from './Y';",
      "import Z from './Z';",
      "import L, { L1 } from './L';",
      "import { M1 } from './M';",
      "import N, { N1, N2 } from './N';",
      "import { G1, G2, G3, G4, G5 } from './G';",
      "import A, * as all from './A';",
      "import * as AllX from './X';",
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
    importExport.addImportFrom(V_FILE, './', '', 'A');
    expectLines(V_FILE, ["import { A } from './';"]);
  });

  it('should add import specifier(s) when module exist', () => {
    vio.put(V_FILE, CODE);
    importExport.addImportFrom(V_FILE, './A', 'AA', 'A1');
    importExport.addImportFrom(V_FILE, './D', 'W', 'Y');
    importExport.addImportFrom(V_FILE, './E', '', ['E', 'E1']);
    importExport.addImportFrom(V_FILE, './F', 'F');
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
    importExport.addExportFrom(V_FILE, './K', 'K');
    importExport.addExportFrom(V_FILE, './L', 'L', 'L1');
    importExport.addExportFrom(V_FILE, './M', '', 'M1');
    importExport.addExportFrom(V_FILE, './N', 'N', ['N1', 'N2']);

    expectLines(V_FILE, [
      "export { default as K } from './K';",
      "export { default as L, L1 } from './L';",
      "export { M1 } from './M';",
      "export { default as N, N1, N2 } from './N';",
    ]);
  });

  it('should add export specifier(s) when module exist', () => {
    vio.put(V_FILE, CODE);
    importExport.addExportFrom(V_FILE, './A', 'AA', 'A1');
    importExport.addExportFrom(V_FILE, './D', 'W', 'Y');
    importExport.addExportFrom(V_FILE, './E', '', ['E', 'E1']);
    importExport.addExportFrom(V_FILE, './F', 'F');

    expectLines(V_FILE, [
      "export { default as A, A1 } from './A';",
      "export { default as W, C, D, Z, Y } from './D';",
      "export { E, E1 } from './E';",
    ]);
  });
});

describe('renameImportSpecifier', () => {
  const CODE = `\
import A from './A';
import { C, D, Z as ZZ } from './D';
import { E } from './E';
import { E as EE } from './EE';
import F from './F';
import * as AllX from './X';
import {
  G1,
  G2,
  G3,
} from './G';
const a = A;
const d = D;
const e = E;
`;
  it('should rename imported specifiers correctly', () => {
    vio.put(V_FILE, CODE);
    importExport.renameImportSpecifier(V_FILE, 'A', 'A1');
    importExport.renameImportSpecifier(V_FILE, 'D', 'D1');
    importExport.renameImportSpecifier(V_FILE, 'Z', 'Z1');
    importExport.renameImportSpecifier(V_FILE, 'E', 'E1');
    importExport.renameImportSpecifier(V_FILE, 'G1', 'GG1');
    importExport.renameImportSpecifier(V_FILE, 'AllX', 'X');
    expectLines(V_FILE, [
      "import A1 from './A';",
      "import { C, D1, Z1 as ZZ } from './D';",
      "import { E1 } from './E';",
      "import { E1 as EE } from './EE';",
      "import * as X from './X';",
      '  GG1,',
      'const a = A1;',
      'const d = D1;',
    ]);
  });

  it('should rename imported specifiers correctly with specified module source', () => {
    vio.put(V_FILE, CODE);
    importExport.renameImportSpecifier(V_FILE, 'E', 'E1', './E');
    importExport.renameImportSpecifier(V_FILE, 'E', 'E2', './EE');

    expectLines(V_FILE, [
      "import { E1 } from './E';",
      "import { E2 as EE } from './EE';",
      'const e = E1;',
    ]);
  });
});

describe('renameExportSpecifier', () => {
  const CODE = `\
export { default as A } from './A';
export { C, D, Z } from './D';
export { E } from './E';
export { default as F } from './F';
`;
  it('renames export specifier when module source not specified', () => {
    vio.put(V_FILE, CODE);
    importExport.renameExportSpecifier(V_FILE, 'A', 'A1');
    importExport.renameExportSpecifier(V_FILE, 'D', 'D1');
    expectLines(V_FILE, [
      "export { default as A1 } from './A';",
      "export { C, D1, Z } from './D';",
    ]);
  });

  it('renames export specifier when module source is specified', () => {
    vio.put(V_FILE, CODE);
    importExport.renameExportSpecifier(V_FILE, 'A', 'A1', './A');
    importExport.renameExportSpecifier(V_FILE, 'E', 'E1', './C');
    expectLines(V_FILE, ["export { default as A1 } from './A';", "export { E } from './E';"]);
  });
});

describe('removeImportSpecifier', () => {
  const CODE = `\
import A from './A';
import { C, D, Z } from './D';
import { E } from './E';
import F from './F';
import * as AllX from './X';
import {
G1,
G2,
} from './G';
`;
  it('should remove give import specifier', () => {
    vio.put(V_FILE, CODE);
    importExport.removeImportSpecifier(V_FILE, ['E', 'D', 'G1', 'AllX']);
    expectLines(V_FILE, ["import { C, Z } from './D';", "import { G2 } from './G';"]);
    expectNoLines(V_FILE, [
      "import { E } from './E';",
      "import * as AllX from './X';",
      "import { G1, G2 } from './G';",
    ]);
  });
});

const CODE_3 = `\
import A from './A';
import { C, D, Z } from './D';
import { E } from './E';
import F from './F';
import {
  G1,
  G2,
} from './G';
`;
describe('removeNamedExport', () => {
  it('should remove give export specifier', () => {
    vio.put(V_FILE, CODE_3);
    importExport.removeImportSpecifier(V_FILE, ['E', 'D']);
    expectLines(V_FILE, ["import { C, Z } from './D';"]);
    expectNoLines(V_FILE, ["import { E } from './E';"]);
  });
});

describe('removeImportBySource', () => {
  it('should remove import statement by given source', () => {
    vio.put(V_FILE, CODE_3);
    importExport.removeImportBySource(V_FILE, './A');
    importExport.removeImportBySource(V_FILE, './D');
    expectNoLines(V_FILE, ["import A from './A';", "import { C, D, Z } from './D';"]);
  });
});
