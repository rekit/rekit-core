/* eslint quotes: 0 */
'use strict';

const vio = require('../../core/vio');
const style = require('../../core/refactor/style');
const helpers = require('../helpers');

const expectLines = helpers.expectLines;
const V_FILE = 'vio-temp-file.js';
describe('renameCssClassName', () => {
  const CODE = `\
import React, { PureComponent } from 'react';

export class Hello extends PureComponent {
  render() {
    return (
      <h1 className="home-hello">
        <label className="home-hello-label">Label</label>
        Welcome to your Rekit project!
      </h1>
    );
  }
}

export default Hello;
`;
  it('rename className property', () => {
    vio.put(V_FILE, CODE);
    style.renameCssClassName(V_FILE, 'home-hello', 'home-new-hello');
    expectLines(V_FILE, [
      '      <h1 className="home-new-hello">',
      '        <label className="home-new-hello-label">Label</label>',
    ]);
  });
});
