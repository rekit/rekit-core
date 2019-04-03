'use strict';

const generate = require('@babel/generator').default;
const format = require('./format');

// Generate and format code based on prettier config from ast node.
module.exports = (astNode, filePath) => {
  let code = generate(astNode, { comments: false }).code;
  code = format(code, filePath, { insertFinalNewline: false }).formatted;
  return code;
};
