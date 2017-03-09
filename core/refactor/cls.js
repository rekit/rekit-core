'use strict';

const traverse = require('babel-traverse').default;
const common = require('./common');
const identifier = require('./identifier');

function renameClassName(ast, oldName, newName) {
  // Summary:
  //  Rename the class name in a module
  // Return:
  //  All changes needed.

  let defNode = null;
  // Find the definition node of the class
  traverse(ast, {
    ClassDeclaration(path) {
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
  renameClassName: common.acceptFilePathForAst(renameClassName),
};
