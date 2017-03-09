'use strict';

const traverse = require('babel-traverse').default;
const common = require('./common');

function getDefNode(name, scope) {
  // Summary:
  //  Get the definition node for an identifier

  while (scope) {
    if (scope.bindings[name]) return scope.bindings[name].identifier;
    scope = scope.parent;
  }
  return null;
}

function renameIdentifier(ast, oldName, newName, defNode) {
  // Summary:
  //  Rename identifiers with oldName in ast
  const changes = [];
  function rename(path) {
    if (
      path.node.name === oldName
      && path.key !== 'imported'// it should NOT be imported specifier
      && getDefNode(path.node.name, path.scope) === defNode) {
      path.node.name = newName;
      changes.push({
        start: path.node.start,
        end: path.node.end,
        replacement: newName,
      });
    }
  }
  traverse(ast, {
    JSXIdentifier: rename,
    Identifier: rename,
  });
  return changes;
}

module.exports = {
  renameIdentifier: common.acceptFilePathForAst(renameIdentifier),
};
