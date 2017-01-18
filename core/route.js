'use strict';

const _ = require('lodash');
const traverse = require('babel-traverse').default;
const refactor = require('./refactor');
const utils = require('./utils');
const vio = require('./vio');
const assert = require('./assert');

function add(feature, component, args) {
  assert.notEmpty(feature, 'feature');
  assert.notEmpty(component, 'component name');
  assert.featureExist(feature);
  args = args || {};
  const urlPath = _.kebabCase(args.urlPath || component);
  const targetPath = utils.mapFeatureFile(feature, 'route.js');
  refactor.addImportFrom(targetPath, './', '', _.pascalCase(component));

  const ast = vio.getAst(targetPath);
  let arrNode = null;
  traverse(ast, {
    ObjectProperty(path) {
      const node = path.node;
      if (_.get(node, 'key.name') === 'childRoutes' && _.get(node, 'value.type') === 'ArrayExpression') {
        arrNode = node.value;
        path.stop();
      }
    }
  });
  if (arrNode) {
    const rule = `{ path: '${urlPath}', name: '${args.pageName || _.upperFirst(_.lowerCase(component))}', component: ${_.pascalCase(component)}${args.isIndex ? ', isIndex: true' : ''} }`;
    const changes = refactor.addToArrayByNode(arrNode, rule);
    const code = refactor.updateSourceCode(vio.getContent(targetPath), changes);
    vio.save(targetPath, code);
  } else {
    utils.fatal(`You are adding a route rule, but can't find childRoutes property in 'src/features/${feature}/route.js', please check.`);
  }


  // const lines = vio.getLines(targetPath);
  // let i = refactor.lineIndex(lines, '} from \'./index\';');
  // lines.splice(i, 0, `  ${_.pascalCase(component)},`);
  // i = refactor.lineIndex(lines, 'path: \'*\'');
  // if (i === -1) {
  //   i = refactor.lastLineIndex(lines, /^ {2}]/);
  // }
  // lines.splice(i, 0, `    { path: '${urlPath}', name: '${args.pageName || _.upperFirst(_.lowerCase(component))}', component: ${_.pascalCase(component)}${args.isIndex ? ', isIndex: true' : ''} },`);
  // vio.save(targetPath, lines);
}

function remove(feature, component) {
  assert.notEmpty(feature, 'feature');
  assert.notEmpty(component, 'component name');
  assert.featureExist(feature);

  const targetPath = utils.mapFeatureFile(feature, 'route.js');
  const lines = vio.getLines(targetPath);
  refactor.removeLines(lines, `  ${_.pascalCase(component)},`);
  const removed = refactor.removeLines(lines, new RegExp(`component: ${_.pascalCase(component)}[ ,}]`));
  vio.save(targetPath, lines);
  return removed;
}

function move(source, dest) {
  if (source.feature === dest.feature) {
    // If in the same feature, rename imported component name
    const targetPath = utils.mapFeatureFile(source.feature, 'route.js');
    const ast = vio.getAst(targetPath);
    const oldName = _.pascalCase(source.name);
    const newName = _.pascalCase(dest.name);
    const changes = [].concat(
      refactor.renameImportSpecifier(ast, oldName, newName),
      refactor.renameStringLiteral(ast, _.kebabCase(oldName), _.kebabCase(newName)), // Rename path
      refactor.renameStringLiteral(ast, _.upperFirst(_.lowerCase(oldName)), _.upperFirst(_.lowerCase(newName))) // Rename name
    );
    const code = refactor.updateSourceCode(vio.getContent(targetPath), changes);
    vio.save(targetPath, code);
  } else {
    const lines = remove(source.feature, source.name);
    let urlPath = null;
    let isIndex = false;
    let name = null;
    if (lines && lines.length) {
      const m1 = /path: *'([^']+)'/.exec(lines[0]);
      if (m1) {
        urlPath = m1[1];
        if (urlPath === _.kebabCase(source.name)) {
          urlPath = null;
        }
      }
      const m2 = /name: *'([^']+)'/.exec(lines[0]);
      if (m2) {
        name = m2[1];
        if (name === _.upperFirst(_.lowerCase(source.name))) {
          name = null;
        }
      }
      isIndex = /isIndex: true/.test(lines[0]);
    }
    add(dest.feature, dest.name, urlPath, isIndex, name);
  }
}

module.exports = {
  add,
  remove,
  move,
};
