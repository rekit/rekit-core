'use strict';

const _ = require('lodash');
const traverse = require('babel-traverse').default;
const common = require('./common');
const linesManager = require('./lines');

function renameCssClassName(ast, oldName, newName) {
  // Summary:
  //  Rename the css class name in a JSXAttribute
  // Return:
  //  All changes needed.

  const changes = [];
  // Find the definition node of the className attribute
  // const reg = new RegExp(`(^| +)(${oldName})( +|$)`);
  traverse(ast, {
    StringLiteral(path) {
      // Simple replace literal strings
      const i = path.node.value.indexOf(oldName);
      if (i >= 0) {
        changes.push({
          start: path.node.start + i + 1,
          end: path.node.start + i + oldName.length + 1,
          replacement: newName,
        });
      }
    },
  });
  return changes;
}

function addStyleImport(lines, moduleSource) {console.log('add style import')
  const i = linesManager.lastLineIndex(lines, '@import ');
  const line = `@import '${moduleSource}';`;
  if (!linesManager.lineExists(lines, line)) {
    lines.splice(i + 1, 0, line);
  }
}

function removeStyleImport(lines, moduleSource) {
  linesManager.removeLines(lines, new RegExp(`@import '${_.escapeRegExp(moduleSource)}(\.less|\.scss)?'`));
}

function renameStyleImport(lines, oldMoudleSource, newModuleSource) {
  const i = linesManager.lineIndex(lines, new RegExp(`@import '${_.escapeRegExp(oldMoudleSource)}(\.less|\.scss)?'`));
  lines[i] = `@import '${newModuleSource}';`;
}

module.exports = {
  renameCssClassName: common.acceptFilePathForAst(renameCssClassName),
  addStyleImport: common.acceptFilePathForLines(addStyleImport),
  removeStyleImport: common.acceptFilePathForLines(removeStyleImport),
  renameStyleImport: common.acceptFilePathForLines(renameStyleImport),
};
