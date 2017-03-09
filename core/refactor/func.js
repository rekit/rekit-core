'use strict';

const traverse = require('babel-traverse').default;
const common = require('./common');
const identifier = require('./identifier');

function renameFunctionName(ast, oldName, newName) {
  // Summary:
  //  Rename the name of the function first found. Usually used by
  //  flat function definition file.

  let defNode = null;
  // Find the definition node of the class
  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id && path.node.id.name === oldName) {
        defNode = path.node.id;
      }
    },
  });

  if (defNode) {
    return identifier.renameIdentifier(ast, oldName, newName, defNode);
  }
  return [];
}

module.exports = {
  renameFunctionName: common.acceptFilePathForAst(renameFunctionName),
};
