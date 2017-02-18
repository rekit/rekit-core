'use strict';

// Summary:
//  Rename variables in a Rekit element

const _ = require('lodash');
const mPath = require('path');
const shell = require('shelljs');
const babelTypes = require('babel-types');
const traverse = require('babel-traverse').default;
const generate = require('babel-generator').default;
const vio = require('./vio');
const utils = require('./utils');

const babelGeneratorOptions = {
  quotes: 'single',
};

function isStringMatch(str, match) {
  if (_.isString(match)) {
    return _.includes(str, match);
  } else if (_.isFunction(match)) {
    return match(str);
  }
  return match.test(str);
}

function isSameModuleSource(s1, s2, context) {
  
}

function objExpToObj(objExp) {
  // only for non-computed properties
  const obj = {};
  objExp.properties.forEach((p) => {
    if (p.computed) return;
    obj[p.key.name] = p;
  });
  return obj;
}

function nearestCharBefore(char, str, index) {
  // Find the nearest char index before given index. skip white space strings
  // If not found, return -1
  // eg: nearestCharBefore(',', '1,    2, 3', 4) => 1
  let i = index - 1;
  while (i >= 0) {
    if (str.charAt(i) === char) return i;
    if (!/\s/.test(str.charAt(i))) return -1;
    i -= 1;
  }
  return -1;
}

function nearestCharAfter(char, str, index) {
  // Find the nearest char index before given index. skip white space strings
  // If not found, return -1
  let i = index + 1;
  while (i < str.length) {
    if (str.charAt(i) === char) return i;
    if (!/\s/.test(str.charAt(i))) return -1;
    i += 1;
  }
  return -1;
}

function getCodeByNode(node) {
  return generate(node, babelGeneratorOptions).code;
}

function updateSourceCode(code, changes) {
  // Summary:
  //  This must be called before code is changed some places else rather than ast

  changes.sort((c1, c2) => c2.start - c1.start);
  // Remove same or overlapped changes
  const newChanges = _.reduce(changes, (cleanChanges, curr) => {
    const last = _.last(cleanChanges);

    if (!cleanChanges.length || last.start > curr.end) {
      cleanChanges.push(curr);
    } else if (last.start === last.end && last.end === curr.start && curr.start === curr.end) {
      // insert code at the same position, merge them
      last.replacement += curr.replacement;
    }
    return cleanChanges;
  }, []);

  const chars = code.split('');
  newChanges.forEach((c) => {
    // Special case: after the change, two empty lines occurs, should delete one line
    if (c.replacement === '' && (c.start === 0 || chars[c.start - 1] === '\n') && chars[c.end] === '\n') {
      c.end += 1;
    }
    chars.splice(c.start, c.end - c.start, c.replacement);
  });
  return chars.join('');
}

function updateFile(filePath, changes) {
  // Summary:
  //  Update the source file by changes.

  if (_.isFunction(changes)) {
    const ast = vio.getAst(filePath);
    changes = changes(ast);
  }
  let code = vio.getContent(filePath);
  code = updateSourceCode(code, changes);
  vio.save(filePath, code);
}

function formatMultilineImport(importCode) {
  // format import statement to:
  // import {
  //   name1,
  //   name2,
  // } from './xxx';

  const m = importCode.match(/\{([^}]+)\}/);
  if (m) {
    const arr = _.compact(m[1].split(/, */).map(_.trim));
    if (arr.length) {
      return importCode.replace(/\{[^}]+\}/, `{\n  ${arr.join(',\n  ')},\n}`);
    }
  }
  return importCode;
}

function addImportFrom(ast, moduleSource, defaultImport, namedImport, namespaceImport) {
  // Summary:
  //  Add import from source module. Such as import { xxx } from './x';
  let names = [];

  if (namedImport) {
    if (typeof namedImport === 'string') {
      names.push(namedImport);
    } else {
      names = names.concat(namedImport);
    }
  }

  const changes = [];
  const t = babelTypes;

  let targetImportPos = 0;
  let sourceExisted = false;
  traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      // multilines means whether to separate import specifiers into different lines
      const multilines = node.loc.start.line !== node.loc.end.line;
      targetImportPos = path.node.end + 1;

      if (!node.specifiers || !node.source || node.source.value !== moduleSource) return;
      sourceExisted = true;
      let newNames = [];
      const alreadyHaveDefaultImport = !!_.find(node.specifiers, { type: 'ImportDefaultSpecifier' });
      const alreadyHaveNamespaceImport = !!_.find(node.specifiers, { type: 'ImportNamespaceSpecifier' });
      if (defaultImport && !alreadyHaveDefaultImport) newNames.push(defaultImport);
      if (namespaceImport && !alreadyHaveNamespaceImport) newNames.push(namespaceImport);

      newNames = newNames.concat(names);

      // only add names which don't exist
      newNames = newNames.filter(n => !_.find(node.specifiers, s => s.local.name === n));

      if (newNames.length > 0) {
        const newSpecifiers = [].concat(node.specifiers);
        newNames.forEach((n) => {
          const local = t.identifier(n);
          const imported = local; // TODO: doesn't support local alias.
          if (n === defaultImport) {
            newSpecifiers.unshift(t.importDefaultSpecifier(local));
          } else if (n === namespaceImport) {
            newSpecifiers.push(t.importNamespaceSpecifier(local));
          } else {
            newSpecifiers.push(t.importSpecifier(local, imported));
          }
        });

        const newNode = Object.assign({}, node, { specifiers: newSpecifiers });
        let newCode = generate(newNode, babelGeneratorOptions).code;

        if (multilines) {
          newCode = formatMultilineImport(newCode);
        }
        changes.push({
          start: node.start,
          end: node.end,
          replacement: newCode,
        });
      }
    }
  });

  if (changes.length === 0 && !sourceExisted) {
    // add new import declaration if module source doesn't exist
    const specifiers = [];
    if (defaultImport) {
      specifiers.push(t.importDefaultSpecifier(t.identifier(defaultImport)));
    }
    if (namespaceImport) {
      specifiers.push(t.importNamespaceSpecifier(t.identifier(namespaceImport)));
    }

    names.forEach((n) => {
      const local = t.identifier(n);
      const imported = local;
      specifiers.push(t.importSpecifier(local, imported));
    });

    const node = t.importDeclaration(specifiers, t.stringLiteral(moduleSource));
    const code = generate(node, babelGeneratorOptions).code;
    changes.push({
      start: targetImportPos,
      end: targetImportPos,
      replacement: `${code}\n`,
    });
  }

  return changes;
}

function addExportFrom(ast, moduleSource, defaultExport, namedExport) {
  // Summary:
  //  Add export from source module. Such as export { xxx } from './x';
  let names = [];

  if (namedExport) {
    if (typeof namedExport === 'string') {
      names.push(namedExport);
    } else {
      names = names.concat(namedExport);
    }
  }

  const changes = [];
  const t = babelTypes;

  let targetExportPos = 0;
  let sourceExisted = false;
  traverse(ast, {
    ExportNamedDeclaration(path) {
      const node = path.node;
      targetExportPos = path.node.end + 1;
      if (!node.specifiers || !node.source || node.source.value !== moduleSource) return;
      sourceExisted = true;
      let newNames = [];
      const alreadyHaveDefaultExport = !!_.find(node.specifiers, s => _.get(s, 'local.name') === 'default');
      if (defaultExport && !alreadyHaveDefaultExport) newNames.push(defaultExport);

      newNames = newNames.concat(names);

      // only add names which don't exist
      newNames = newNames.filter(n => !_.find(node.specifiers, s => (_.get(s, 'exported.name') || _.get(s, 'local.name')) === n));

      if (newNames.length > 0) {
        const newSpecifiers = [].concat(node.specifiers);
        newNames.forEach((n) => {
          const local = t.identifier(n);
          const exported = local; // TODO: doesn't support local alias.
          if (n === defaultExport) {
            newSpecifiers.unshift(t.exportSpecifier(t.identifier('default'), exported));
          } else {
            newSpecifiers.push(t.exportSpecifier(local, exported));
          }
        });

        const newNode = Object.assign({}, node, { specifiers: newSpecifiers });
        const newCode = generate(newNode, babelGeneratorOptions).code;
        changes.push({
          start: node.start,
          end: node.end,
          replacement: newCode,
        });
      }
    }
  });

  if (changes.length === 0 && !sourceExisted) {
    const specifiers = [];
    if (defaultExport) {
      specifiers.push(t.exportSpecifier(t.identifier('default'), t.identifier(defaultExport)));
    }

    names.forEach((n) => {
      const local = t.identifier(n);
      const exported = local;
      specifiers.push(t.exportSpecifier(local, exported));
    });

    const node = t.ExportNamedDeclaration(null, specifiers, t.stringLiteral(moduleSource));
    const code = generate(node, babelGeneratorOptions).code;
    changes.push({
      start: targetExportPos,
      end: targetExportPos,
      replacement: `${code}\n`,
    });
  }

  return changes;
}

function addToArrayByNode(node, code) {
  // node: the arr expression node
  // code: added as the last element of the array

  const multilines = node.loc.start.line !== node.loc.end.line;
  let insertPos = node.start + 1; // insert after '['

  if (node.elements.length) {
    const ele = _.last(node.elements);
    insertPos = ele.end;
  }

  let replacement;
  if (multilines) {
    const indent = _.repeat(' ', node.loc.end.column - 1);
    replacement = `\n${indent}  ${code}`;
    if (node.elements.length) {
      replacement = `,${replacement}`;
    } else {
      replacement = `${replacement},`;
    }
  } else {
    replacement = code;
    if (node.elements.length > 0) {
      replacement = `, ${code}`;
    }
  }
  return [{
    start: insertPos,
    end: insertPos,
    replacement,
  }];
}

function removeFromArrayByNode(node, eleNode) {
  const elements = node.elements;

  if (!elements.includes(eleNode)) {
    utils.warn('Failed to find element when trying to remove element from array.');
    return [];
  }

  if (!node._filePath) {
    utils.fatalError('No _filePath property found on node when removing element from array');
    return null;
  }

  const content = vio.getContent(node._filePath);
  let startPos = nearestCharBefore(',', content, eleNode.start);
  if (startPos < 0) {
    // it's the first element
    startPos = node.start + 1;
  }

  let endPos = eleNode.end;

  if (elements.length === 1) {
    // if the element is the only element, try to remove the trailing comma if exists
    const nextComma = nearestCharAfter(',', content, endPos - 1);
    if (nextComma >= 0) endPos = nextComma + 1;
  }

  return [{
    start: startPos,
    end: endPos,
    replacement: '',
  }];
}

function addToArray(ast, varName, identifierName) {
  // Summary:
  //  Add an element to a specified array expression
  //  eg: const arr = [a, b, c];
  //  Added 'd' => [a, b, c, d];
  //  It only adds to the first matched array.

  let changes = [];
  traverse(ast, {
    VariableDeclarator(path) {
      const node = path.node;
      if (_.get(node, 'id.name') !== varName || _.get(node, 'init.type') !== 'ArrayExpression') return;
      node.init._filePath = ast._filePath;
      changes = addToArrayByNode(node.init, identifierName);
      path.stop();
    }
  });
  return changes;
}

function removeFromArray(ast, varName, identifierName) {
  let changes = [];
  traverse(ast, {
    VariableDeclarator(path) {
      const node = path.node;
      if (_.get(node, 'id.name') !== varName || _.get(node, 'init.type') !== 'ArrayExpression') return;
      node.init._filePath = ast._filePath;
      const toRemove = _.find(node.init.elements, ele => ele.name === identifierName);
      changes = removeFromArrayByNode(node.init, toRemove);
      path.stop();
    }
  });
  return changes;
}

function addObjectProperty(ast, varName, propName, propValue) {
  const changes = [];
  traverse(ast, {
    VariableDeclarator(path) {
      const node = path.node;
      if ((varName && _.get(node, 'id.name') !== varName) || _.get(node, 'init.type') !== 'ObjectExpression') return;
      const props = _.get(node, 'init.properties');

      const multilines = node.loc.start.line !== node.loc.end.line;
      // Check if it exists
      const targetPropNode = _.find(props, p =>
        _.get(p, 'key.type') === 'Identifier'
        && _.get(p, 'key.name') === propName
        && !p.computed);

      if (!targetPropNode) {
        const targetPos = node.end - 1;
        if (multilines) {
          const indent = _.repeat(' ', node.loc.end.column - 1);
          changes.push({
            start: targetPos,
            end: targetPos,
            replacement: `${indent}  ${propName}: ${propValue},\n`,
          });
        } else {
          changes.push({
            start: targetPos,
            end: targetPos,
            replacement: `${props.length ? ', ' : ' '}${propName}: ${propValue} `,
          });
        }
      } else {
        utils.warn(`Property name '${propName}' already exists for ${varName}.`);
      }
    },
  });
  return changes;
}

function setObjectProperty(ast, varName, propName, propValue) {
  const changes = [];
  traverse(ast, {
    VariableDeclarator(path) {
      const node = path.node;
      if ((varName && _.get(node, 'id.name') !== varName) || _.get(node, 'init.type') !== 'ObjectExpression') return;
      const props = _.get(node, 'init.properties');

      // Check if it exists
      const targetPropNode = _.find(props, p =>
        _.get(p, 'key.type') === 'Identifier'
        && _.get(p, 'key.name') === propName
        && !p.computed);

      if (targetPropNode) {
        changes.push({
          start: targetPropNode.value.start,
          end: targetPropNode.value.end,
          replacement: propValue,
        });
      }
    },
  });
  return changes;
}

function renameObjectProperty(ast, varName, oldName, newName) {
  // Summary:
  //  Rename the object property and only for non-computed identifier property
  // Return:
  //  All changes needed.

  const changes = [];
  traverse(ast, {
    VariableDeclarator(path) {
      const node = path.node;
      if ((varName && _.get(node, 'id.name') !== varName) || _.get(node, 'init.type') !== 'ObjectExpression') return;
      const props = _.get(node, 'init.properties');

      // const multilines = node.loc.start.line !== node.loc.end.line;
      const targetPropNode = _.find(props, p =>
        _.get(p, 'key.type') === 'Identifier'
        && _.get(p, 'key.name') === oldName
        && !p.computed);

      if (targetPropNode) {
        changes.push({
          start: targetPropNode.key.start,
          end: targetPropNode.key.end,
          replacement: newName,
        });
      }
    },
  });
  return changes;
}

function removeObjectProperty(ast, varName, propName) {
  const changes = [];
  traverse(ast, {
    VariableDeclarator(path) {
      const node = path.node;
      if ((varName && _.get(node, 'id.name') !== varName) || _.get(node, 'init.type') !== 'ObjectExpression') return;
      const props = _.get(node, 'init.properties');

      const multilines = node.loc.start.line !== node.loc.end.line;

      const targetPropNode = _.find(props, p =>
        _.get(p, 'key.type') === 'Identifier'
        && _.get(p, 'key.name') === propName
        && !p.computed);

      if (targetPropNode) {
        const targetIndex = _.indexOf(props, targetPropNode);
        let startIndex;
        let endIndex;
        if (targetIndex > 0) {
          startIndex = props[targetIndex - 1].end;
          endIndex = targetPropNode.end;
        } else {
          startIndex = node.init.start + 1;
          endIndex = targetPropNode.end + (multilines || targetIndex < props.length - 1 ? 1 : 0);
        }
        changes.push({
          start: startIndex,
          end: endIndex,
          replacement: '',
        });
      }
    },
  });
  return changes;
}

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
    return renameIdentifier(ast, oldName, newName, defNode);
  }
  return [];
}

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
    return renameIdentifier(ast, oldName, newName, defNode);
  }
  return [];
}

function renameImportAsSpecifier(ast, oldName, newName) {
  let defNode = null;
  let changes = [];

  traverse(ast, {
    ImportSpecifier(path) {
      if (_.get(path.node, 'local.name') === oldName) {
        defNode = path.node.local;
      }
    }
  });
  if (defNode) {
    changes = changes.concat(renameIdentifier(ast, oldName, newName, defNode));
  }
  return changes;
}

function renameImportSpecifier(ast, oldName, newName, moduleSource) {
  // Summary:
  //  Rename the import(default, named) variable name and their reference.
  //  The simple example is to rename a component
  //  NOTE: only rename imported name!
  //  eg: import { A as A1 } from './A'; A -> B  import { B as A1 } from './A';
  //  import fetchList from './action';
  //  import { fetchList as fetchTopicList } from '../topic/action';

  let defNode = null;
  let changes = [];

  traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      if (moduleSource && _.get(node, 'source.value') !== moduleSource) return;
      // console.log(_.get(node, 'source.value'), moduleSource);
      node.specifiers.forEach((specifier) => {
        if (
          (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier')
          && _.get(specifier, 'local.name') === oldName
        ) {
          defNode = specifier.local;
        }

        // only rename imported specifier
        if (specifier.type === 'ImportSpecifier' && _.get(specifier, 'imported.name') === oldName) {
          if (_.get(specifier, 'local.name') === oldName) {
            defNode = specifier.local;
          } else {
            changes.push({
              start: specifier.imported.start,
              end: specifier.imported.end,
              replacement: newName,
            });
          }
        }
      });
    }
  });
  if (defNode) {
    changes = changes.concat(renameIdentifier(ast, oldName, newName, defNode));
  }
  return changes;
}

function renameExportSpecifier(ast, oldName, newName, moduleSource) {
  // It only rename export specifier but not references.
  const changes = [];
  traverse(ast, {
    ExportSpecifier(path) {
      const node = path.node;
      if (moduleSource && _.get(path.parentPath.node, 'source.value') !== moduleSource) return;

      if (_.get(node, 'local.name') === oldName) {
        changes.push({
          start: node.local.start,
          end: node.local.end,
          replacement: newName,
        });
      } else if (_.get(node, 'exported.name') === oldName) {
        changes.push({
          start: node.exported.start,
          end: node.exported.end,
          replacement: newName,
        });
      }
    }
  });
  return changes;
}

function renameModuleSource(ast, oldModuleSource, newModuleSource) {
  // Summary:
  //  Rename the module source for import/export xx from moduleSource.
  //  It only compares the string rather that resolve to the absolute path.

  const changes = [];

  function renameSource(path) {
    const node = path.node;
    if (node.source && node.source.value === oldModuleSource) {
      changes.push({
        start: node.source.start + 1,
        end: node.source.end - 1,
        replacement: newModuleSource,
      });
    }
  }

  traverse(ast, {
    ImportDeclaration: renameSource,
    ExportNamedDeclaration: renameSource,
  });

  return changes;
}

function renameStringLiteral(ast, oldName, newName) {
  // Summary:
  //  Rename the string literal in ast
  // Return:
  //  All changes needed.

  const changes = [];
  traverse(ast, {
    StringLiteral(path) {
      // Simple replace literal strings
      if (path.node.value === oldName) {
        changes.push({
          start: path.node.start + 1,
          end: path.node.end - 1,
          replacement: newName,
        });
      }
    },
  });
  return changes;
}

function replaceStringLiteral(ast, oldName, newName, fullMatch = true) {
  // Summary:
  //  Replace the string literal in ast
  // Return:
  //  All changes needed.

  const changes = [];
  traverse(ast, {
    StringLiteral(path) {
      // Simply replace literal strings
      if (fullMatch && path.node.value === oldName) {
        changes.push({
          start: path.node.start + 1,
          end: path.node.end - 1,
          replacement: newName,
        });
      } else if (!fullMatch && _.includes(path.node.value, oldName)) {
        const i = path.node.value.indexOf(oldName);
        const start = path.node.start + 1 + i;
        const end = start + oldName.length;
        changes.push({
          start,
          end,
          replacement: newName,
        });
      }
    },
  });
  return changes;
}

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

function removeImportSpecifier(ast, name) {
  // Remove import specifier by local name

  let names = name;
  if (typeof name === 'string') {
    names = [name];
  }
  const changes = [];
  traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      const multilines = node.loc.start.line !== node.loc.end.line;
      if (!node.specifiers) return;
      const newSpecifiers = node.specifiers.filter(s => !names.includes(s.local.name));
      if (newSpecifiers.length === 0) {
        // no specifiers, should delete the import statement
        changes.push({
          start: node.start,
          end: node.end,
          replacement: '',
        });
      } else if (newSpecifiers.length !== node.specifiers.length) {
        // remove the specifier import
        const newNode = Object.assign({}, node, { specifiers: newSpecifiers });
        let newCode = generate(newNode, {}).code;
        if (multilines) newCode = formatMultilineImport(newCode);
        changes.push({
          start: node.start,
          end: node.end,
          replacement: newCode,
        });
      }
    }
  });

  return changes;
}

function removeImportBySource(ast, moduleSource) {
  const changes = [];

  function removeBySource(path) {
    const node = path.node;
    if (!node.source) return;
    if (node.source.value === moduleSource) {
      changes.push({
        start: node.start,
        end: node.end,
        replacement: '',
      });
    }
  }
  traverse(ast, {
    ExportNamedDeclaration: removeBySource,
    ImportDeclaration: removeBySource,
  });

  return changes;
}

function lineIndex(lines, match, fromMatch) {
  if (fromMatch && !_.isNumber(fromMatch)) {
    fromMatch = lineIndex(lines, fromMatch);
  }
  if (_.isString(match)) {
    // Match string
    return _.findIndex(lines, l => l.indexOf(match) >= 0, fromMatch || 0);
  } else if (_.isFunction(match)) {
    // Callback
    return _.findIndex(lines, match);
  }

  // Regular expression
  return _.findIndex(lines, l => match.test(l), fromMatch || 0);
}

function lastLineIndex(lines, match) {
  if (_.isString(match)) {
    // String
    return _.findLastIndex(lines, l => l.indexOf(match) >= 0);
  } else if (_.isFunction(match)) {
    // Callback
    return _.findLastIndex(lines, match);
  }

  // Regular expression
  return _.findLastIndex(lines, l => match.test(l));
}

function removeLines(lines, str) {
  _.remove(lines, line => isStringMatch(line, str));
}

function addImportLine(lines, importLine) {
  // Summary:
  //  Add import npm module to source code (abs path)
  //  Use text matching instead of ast.

  const i = lastLineIndex(lines, /^import /);
  lines.splice(i + 1, 0, importLine);
}

function removeImportLine(file, moduleSource) {
  // Summary:
  //  Remove import xxx from '.xxx' line at the top. Usually used by entry files such as index.js

  const lines = vio.getLines(file);
  removeLines(lines, new RegExp(`import +.* +from +'${_.escapeRegExp(moduleSource)}'`));
}

function addExportFromLine(file, exportLine) {
  // Summary:
  //  Add export xxx from '.xxx' line at the top. Usually used by entry files such as index.js

  const lines = vio.getLines(file);
  const i = lastLineIndex(lines, /^export .* from /);
  lines.splice(i + 1, 0, exportLine);
}

function removeExportFromLine(file, moduleSource) {
  // Summary:
  //  Remove export xxx from '.xxx' line at the top. Usually used by entry files such as index.js

  const lines = vio.getLines(file);
  removeLines(lines, new RegExp(`export +.* +from +'${_.escapeRegExp(moduleSource)}'`));
}

function addStyleImport(lines, moduleSource) {
  const i = lastLineIndex(lines, '@import ');
  lines.splice(i + 1, 0, `@import '${moduleSource}';`);
}

function removeStyleImport(lines, moduleSource) {
  removeLines(lines, new RegExp(`@import '${_.escapeRegExp(moduleSource)}'`));
}

function renameStyleModuleSource(lines, oldMoudleSource, newModuleSource) {
  const i = lineIndex(lines, new RegExp(`@import '${_.escapeRegExp(oldMoudleSource)}'`));
  lines[i] = `@import '${newModuleSource}';`;
}

const propsCache = {};
const depsCache = {};

function getRekitProps(file) {
  if (propsCache[file] && propsCache[file].content === vio.getContent(file)) {
    return propsCache[file].props;
  }
  const ast = vio.getAst(file);
  const ff = {}; // File features

  traverse(ast, {
    ImportDeclaration(path) {
      switch (path.node.source.value) {
        case 'react':
          ff.importReact = true;
          break;
        case 'redux':
          ff.importRedux = true;
          break;
        case 'react-redux':
          ff.importReactRedux = true;
          break;
        case './constants':
          ff.importConstant = true;
          ff.importMultipleConstants = path.node.specifiers.length > 3;
          break;
        default:
          break;
      }
    },
    ClassDeclaration(path) {
      if (
        path.node.superClass
        && path.node.body.body.some(n => n.type === 'ClassMethod' && n.key.name === 'render')
      ) {
        ff.hasClassAndRenderMethod = true;
      }
    },
    CallExpression(path) {
      if (path.node.callee.name === 'connect') {
        ff.connectCall = true;
      }
    },
    ExportNamedDeclaration(path) {
      if (_.get(path, 'node.declaration.id.name') === 'reducer') {
        ff.exportReducer = true;
      }
    }
  });
  const props = {
    component: ff.importReact && ff.hasClassAndRenderMethod && {
      connectToStore: ff.connectCall,
    },
    action: ff.exportReducer && ff.importConstant && {
      isAsync: ff.importMultipleConstants,
    }
  };

  if (props.component) props.type = 'component';
  else if (props.action) props.type = 'action';
  else props.type = 'misc';

  propsCache[file] = {
    content: vio.getContent(file),
    props,
  };
  return props;
}

function getFeatures() {
  return _.toArray(shell.ls(mPath.join(utils.getProjectRoot(), 'src/features')));
}

function getRootRoutePath() {
  const targetPath = utils.mapSrcFile('common/routeConfig.js');
  const ast = vio.getAst(targetPath);
  let rootPath = '';
  traverse(ast, {
    ObjectExpression(path) {
      const node = path.node;
      const props = node.properties;
      if (!props.length) return;
      const obj = {};
      props.forEach((p) => {
        if (_.has(p, 'key.name') && !p.computed) {
          obj[p.key.name] = p;
        }
      });
      if (obj.path && obj.childRoutes && !rootPath) {
        rootPath = _.get(obj.path, 'value.value');
      }
    }
  });
  return rootPath;
}

function getFeatureRoutes(feature) {
  const targetPath = utils.mapFeatureFile(feature, 'route.js');
  const ast = vio.getAst(targetPath);
  const arr = [];
  let rootPath = '';
  let indexRoute = null;

  traverse(ast, {
    ObjectExpression(path) {
      const node = path.node;
      const props = node.properties;
      if (!props.length) return;
      const obj = {};
      props.forEach((p) => {
        if (_.has(p, 'key.name') && !p.computed) {
          obj[p.key.name] = p;
        }
      });
      if (obj.path && obj.component) {
        // in a route config, if an object expression has both 'path' and 'component' property, then it's a route config
        arr.push({
          path: _.get(obj.path, 'value.value'), // only string literal supported
          component: _.get(obj.component, 'value.name'), // only identifier supported
          isIndex: !!obj.isIndex && _.get(obj.isIndex, 'value.value'), // suppose to be boolean
          node: {
            start: node.start,
            end: node.end,
          },
        });
      }
      if (obj.isIndex && obj.component && !indexRoute) {
        // only find the first index route
        indexRoute = {
          component: _.get(obj.component, 'value.name'),
        };
      }
      if (obj.path && obj.childRoutes && !rootPath) {
        rootPath = _.get(obj.path, 'value.value');
        if (!rootPath) rootPath = '$none'; // only find the first rootPath
      }
    }
  });
  const prjRootPath = getRootRoutePath();
  if (rootPath === '$none') rootPath = prjRootPath;
  else if (!/^\//.test(rootPath)) rootPath = prjRootPath + '/' + rootPath;
  rootPath = rootPath.replace(/\/+/, '/');
  arr.forEach((item) => {
    if (!/^\//.test(item.path)) {
      item.path = (rootPath + '/' + item.path).replace(/\/+/, '/');
    }
  });
  if (indexRoute) {
    indexRoute.path = rootPath;
    arr.unshift(indexRoute);
  }
  return arr;
}

function getFeatureStructure(feature) {
  const dir = mPath.join(utils.getProjectRoot(), 'src/features', feature);
  const noneMisc = {};

  const components = shell.ls(dir + '/*.js').map((file) => {
    const props = getRekitProps(file);
    if (props && props.component) {
      noneMisc[file] = true;
      noneMisc[file.replace('.js', '.less')] = true;
      noneMisc[file.replace('.js', '.scss')] = true;
      return Object.assign({
        feature,
        name: mPath.basename(file).replace('.js', ''),
        type: 'component',
        file,
      }, props.component);
    }
    return null;
  }).filter(item => !!item).sort((a, b) => a.name.localeCompare(b.name));

  const actions = shell.ls(dir + '/redux/*.js').map((file) => {
    const props = getRekitProps(file);
    if (props && props.action) {
      noneMisc[file] = true;
      return Object.assign({
        feature,
        name: mPath.basename(file).replace('.js', ''),
        type: 'action',
        file,
      }, props.action);
    }
    return null;
  }).filter(item => !!item).sort((a, b) => a.name.localeCompare(b.name));

  function getMiscFiles(root) {
    const arr = [];
    shell.ls(root).forEach((file) => {
      const fullPath = mPath.join(root, file);
      if (shell.test('-d', fullPath)) {
        // is directory
        arr.push({
          feature,
          name: mPath.basename(fullPath),
          type: 'misc',
          file: fullPath,
          children: getMiscFiles(fullPath),
        });
      } else if (!noneMisc[fullPath]) {
        arr.push({
          feature,
          type: 'misc',
          name: mPath.basename(fullPath),
          file: fullPath,
        });
      }
    });
    return arr.sort((a, b) => {
      if (a.children && !b.children) return -1;
      if (!a.children && b.children) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return {
    actions,
    components,
    routes: getFeatureRoutes(feature),
    misc: getMiscFiles(dir),
  };
}

function isActionEntry(modulePath) {
  return /src\/features\/[^/]+\/redux\/actions\.js$/.test(modulePath);
}

function isFeatureIndex(modulePath) {
  return /src\/features\/[^/]+(\/index)?$/.test(modulePath);
}

function isConstantEntry(modulePath) {
  return /src\/features\/[^/]+\/redux\/constants\.js$/.test(modulePath);
}

function getEntryData(filePath) {
  // Summary:
  //  Get entry files content such as actions.js, index.js where usually define 'export { aaa, bbb } from 'xxx';

  const ast = vio.getAst(filePath);
  const feature = utils.getFeatureName(filePath); // many be empty
  const data = {
    file: filePath,
    feature,
    bySource: {},
    exported: {}
  };
  traverse(ast, {
    ExportNamedDeclaration(path) {
      const node = path.node;
      if (!node.source || !node.source.value) return;
      const sourceFile = utils.resolveModulePath(filePath, node.source.value) + '.js'; // from which file
      const specifiers = {};
      node.specifiers.forEach((specifier) => {
        specifiers[specifier.exported.name] = specifier.local && specifier.local.name || true;
        data.exported[specifier.exported.name] = sourceFile;
      });
      data.bySource[sourceFile] = specifiers;
    },
  });
  return data;
}

function getDeps(filePath) {
  // Summary:
  //   Get dependencies of a module

  if (depsCache[filePath] && depsCache[filePath].content === vio.getContent(filePath)) {
    return depsCache[filePath].deps;
  }

  const ast = vio.getAst(filePath);

  const deps = {
    actions: [],
    components: [],
    misc: [],
    constants: [],
  };

  const namespaceActions = {}; // import * as xxx from 'actions';
  const namespaceIndex = {}; // import * as xxx from 'feature';

  function pushDep(type, data) {
    // Be sure no duplicated deps
    const exist = _.find(deps[type], { feature: data.feature, name: data.name });
    if (!exist) {
      deps.actions.push(data);
    }
  }

  const depFiles = [];

  traverse(ast, {
    ExportNamedDeclaration(path) {
      const depModule = _.get(path, 'node.source.value');
      if (!depModule) return;
      const resolvedPath = utils.resolveModulePath(filePath, depModule);
      if (!utils.isLocalModule(depModule)) return;
      const fullPath = resolvedPath + '.js';
      if (!shell.test('-e', fullPath)) return;  // only depends on js modules, no json or other support
      depFiles.push({
        name: mPath.basename(resolvedPath),
        file: resolvedPath + '.js',
      });
    },
    ImportDeclaration(path) {
      const node = path.node;
      const depModule = node.source.value;
      const resolvedPath = utils.resolveModulePath(filePath, depModule);

      // Only show deps of local modules
      if (!utils.isLocalModule(depModule)) return;

      if (isFeatureIndex(resolvedPath)) {
        // Import from feature index
        let indexFile = resolvedPath;
        if (!/index$/.test(indexFile)) {
          indexFile += '/index';
        }
        indexFile += '.js';

        const indexEntry = getEntryData(indexFile);
        node.specifiers.forEach((specifier) => {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            namespaceIndex[specifier.local.name] = indexEntry;
            return;
          }

          const importedName = specifier.imported.name;
          if (!indexEntry.exported[importedName]) {
            utils.warn(`Warning: can't find '${importedName}' from '${indexFile}'`);
            return;
          }

          depFiles.push({
            name: importedName,
            file: indexEntry.exported[importedName],
          });
        });
        return;
      }

      const fullPath = resolvedPath + '.js';
      if (!shell.test('-e', fullPath)) return;  // only depends on js modules, no json or other support

      // Import from actions
      if (isActionEntry(fullPath)) {
        const actionEntry = getEntryData(fullPath);// getActionEntry(utils.getFeatureName(fullPath));

        node.specifiers.forEach((specifier) => {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            namespaceActions[specifier.local.name] = actionEntry;
            return;
          }

          const importedName = specifier.imported.name;
          if (!actionEntry.exported[importedName]) {
            utils.warn(`Warning: can't find '${importedName}' from '${fullPath}'`);
            return;
          }

          pushDep('actions', {
            feature: actionEntry.feature,
            type: 'action',
            name: importedName,
            file: actionEntry.exported[importedName],
          });
        });
        return;
      }

      if (isConstantEntry(fullPath)) {
        node.specifiers.forEach((specifier) => {
          deps.constants.push({
            name: specifier.imported.name,
            feature: utils.getFeatureName(fullPath),
            file: fullPath,
            type: 'constant',
          });
        });
        return;
      }

      depFiles.push({
        name: mPath.basename(resolvedPath),
        file: resolvedPath + '.js',
      });
    },

    MemberExpression(path) {
      // Find actions imported by NamespaceImport
      const node = path.node;
      const objName = _.get(node, 'object.property.name') || _.get(node, 'object.name'); // this.props.'actions'.fetchNavTree
      const propName = _.get(node, 'property.name'); // this.props.actions.'fetchNavTree'
      if (!objName || !propName) return;
      if (_.has(namespaceActions, objName)) {
        const actionEntry = namespaceActions[objName];
        if (!actionEntry.exported[propName]) return;

        pushDep('actions', {
          feature: actionEntry.feature,
          type: 'action',
          name: propName,
          file: actionEntry.exported[propName],
        });
      } else if (_.has(namespaceIndex, objName)) {
        const indexEntry = namespaceIndex[objName];
        if (!indexEntry.exported[propName]) return;
        depFiles.push({
          name: propName,
          file: indexEntry.exported[propName],
        });
      }
    },
  });

  depFiles.forEach((item) => {
    const props = getRekitProps(item.file);
    // Other files
    if (props.component) {
      const feature = utils.getFeatureName(item.file);
      if (feature && !_.find(deps.component, { feature, name: item.name })) {
        deps.components.push({
          feature,
          type: 'component',
          name: item.name,
          file: item.file,
        });
      }
    } else {
      deps.misc.push({
        feature: utils.getFeatureName(item.file) || null,
        type: 'misc',
        name: mPath.basename(item.file),
        file: item.file,
      });
    }
  });

  depsCache[filePath] = {
    content: vio.getContent(filePath),
    deps,
  };
  return deps;
}

function getSrcFiles(dir) {
  // Summary
  //  Get files under src exclues features folder
  const prjRoot = utils.getProjectRoot();
  if (!dir) dir = mPath.join(prjRoot, 'src');

  return _.toArray(shell.ls(dir))
    .filter(file => mPath.join(prjRoot, 'src/features') !== mPath.join(dir, file)) // exclude features folder
    .map((file) => {
      file = mPath.join(dir, file);
      if (shell.test('-d', file)) {
        return {
          name: mPath.basename(file),
          type: 'misc',
          feature: null,
          file,
          children: getSrcFiles(file),
        };
      }
      let rekitProps = {};
      let deps = null;
      if (/\.js$/.test(file)) {
        rekitProps = getRekitProps(file);
        deps = getDeps(file);
      }
      return {
        name: mPath.basename(file),
        type: rekitProps.component ? 'component' : 'misc',
        feature: null,
        deps,
        file,
      };
    })
    .sort((a, b) => {
      if (a.children && !b.children) return -1;
      else if (!a.children && b.children) return 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
}

// function renameExportFrom(file, oldName, newName, oldModulePath, newModulePath) {
//   // Summary:
//   //  Rename export xxx from '.xxx' at the top. Usually used by entry files such as index.js

//   const isFile = _.isString(file);
//   const ast = isFile ? vio.getAst(file) : file;

//   const changes = [];

//   traverse(ast, {
//     ExportNamedDeclaration(path) {
//       const node = path.node;
//       if (node.source && node.source.value === oldModulePath) {
//         if (newModulePath) {
//           changes.push({
//             start: node.source.start + 1,
//             end: node.source.end - 1,
//             replacement: newModulePath,
//           });
//         }
//         renameSpecifier(node.specifiers);
//       }
//     },
//   });

//   if (isFile) {
//     updateFile(file, changes);
//   }

//   return changes;
// }

function acceptFilePathForAst(func) {
  // Summary:
  //  Wrapper a function that accepts ast also accepts file path.
  //  If it's file path, then update the file immediately.

  return function(file) { // eslint-disable-line
    let ast = file;
    if (_.isString(file)) {
      ast = vio.getAst(file);
    }
    const args = _.toArray(arguments);
    args[0] = ast;

    const changes = func.apply(null, args);

    if (_.isString(file)) {
      updateFile(file, changes);
    }

    return changes;
  };
}

function acceptFilePathForLines(func) {
  // Summary:
  //  Wrapper a function that accepts lines also accepts file path.
  //  If it's file path, then update the file immediately.

  return function(file) { // eslint-disable-line
    let lines = file;
    if (_.isString(file)) {
      lines = vio.getLines(file);
    }
    const args = _.toArray(arguments);
    args[0] = lines;
    func.apply(null, args);

    if (_.isString(file)) {
      vio.save(file, lines);
    }
  };
}

module.exports = {

  isActionEntry,
  isFeatureIndex,
  // getActionEntry,
  // getIndexEntry,
  getEntryData,

  addImportFrom: acceptFilePathForAst(addImportFrom),
  addExportFrom: acceptFilePathForAst(addExportFrom),
  addToArray: acceptFilePathForAst(addToArray),
  removeFromArray: acceptFilePathForAst(removeFromArray),

  addObjectProperty: acceptFilePathForAst(addObjectProperty),
  setObjectProperty: acceptFilePathForAst(setObjectProperty),
  renameObjectProperty: acceptFilePathForAst(renameObjectProperty),
  removeObjectProperty: acceptFilePathForAst(removeObjectProperty),

  renameClassName: acceptFilePathForAst(renameClassName),
  renameFunctionName: acceptFilePathForAst(renameFunctionName),
  renameImportSpecifier: acceptFilePathForAst(renameImportSpecifier),
  renameImportAsSpecifier: acceptFilePathForAst(renameImportAsSpecifier),
  renameExportSpecifier: acceptFilePathForAst(renameExportSpecifier),
  renameCssClassName: acceptFilePathForAst(renameCssClassName),
  renameStringLiteral: acceptFilePathForAst(renameStringLiteral),
  renameModuleSource: acceptFilePathForAst(renameModuleSource),

  replaceStringLiteral: acceptFilePathForAst(replaceStringLiteral),

  removeImportSpecifier: acceptFilePathForAst(removeImportSpecifier),
  // removeExportSpecifier: acceptFilePathForAst(removeExportSpecifier),
  removeImportBySource: acceptFilePathForAst(removeImportBySource),

  addToArrayByNode,
  removeFromArrayByNode,

  getCodeByNode,
  updateSourceCode,
  updateFile,
  objExpToObj,
  // batchUpdate,

  getRekitProps,
  getFeatures,
  getFeatureStructure,
  getDeps,
  getSrcFiles,

  nearestCharBefore,
  nearestCharAfter,

  lineIndex,
  lastLineIndex,
  addImportLine: acceptFilePathForLines(addImportLine),
  removeImportLine: acceptFilePathForLines(removeImportLine),
  addStyleImport: acceptFilePathForLines(addStyleImport),
  removeStyleImport: acceptFilePathForLines(removeStyleImport),
  renameStyleModuleSource: acceptFilePathForLines(renameStyleModuleSource),
  removeLines: acceptFilePathForLines(removeLines),
  addExportFromLine: acceptFilePathForLines(addExportFromLine),
  removeExportFromLine: acceptFilePathForLines(removeExportFromLine),
};
