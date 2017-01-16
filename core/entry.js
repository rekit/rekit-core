'use strict';

// Summary
//  Modify entry files to add/remove entries for page, component, action, etc...

const path = require('path');
const _ = require('lodash');
const vio = require('./vio');
const refactor = require('./refactor');
const utils = require('./utils');
const assert = require('./assert');

module.exports = {
  addToIndex(feature, name) {
    const targetPath = utils.mapFeatureFile(feature, 'index.js');
    refactor.addExportFrom(targetPath, `./${name}`, name);
  },

  removeFromIndex(feature, name) {
    const targetPath = utils.mapFeatureFile(feature, 'index.js');
    refactor.removeImportBySource(targetPath, `./${name}`);
  },

  renameInIndex(feature, oldName, newName) {
    const targetPath = utils.mapFeatureFile(feature, 'index.js');
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.renameExportSpecifier(ast, oldName, newName, `./${oldName}`),
      refactor.renameModuleSource(ast, `./${oldName}`, `./${newName}`)
    ));
  },

  addToStyle(feature, name) {
    const targetPath = utils.mapFeatureFile(feature, 'style.' + utils.getCssExt());
    const lines = vio.getLines(targetPath);
    const i = refactor.lastLineIndex(lines, '@import ');
    lines.splice(i + 1, 0, `@import './${name}.${utils.getCssExt()}';`);
    vio.save(targetPath, lines);
  },

  removeFromStyle(feature, name) {
    const targetPath = utils.mapFeatureFile(feature, 'style.' + utils.getCssExt());
    refactor.removeStyleImport(targetPath, `./${name}.${utils.getCssExt()}`);
  },

  renameInStyle(feature, oldName, newName) {
    const targetPath = utils.mapFeatureFile(feature, 'style.' + utils.getCssExt());
    refactor.renameStyleModuleSource(targetPath, `./${oldName}.${utils.getCssExt()}`, `./${newName}.${utils.getCssExt()}`);
  },

  addToRoute(feature, component, args) {
    assert.notEmpty(feature, 'feature');
    assert.notEmpty(component, 'component name');
    assert.featureExist(feature);
    args = args || {};
    const urlPath = args.urlPath || _.kebabCase(component);
    const targetPath = utils.mapFeatureFile(feature, 'route.js');
    const lines = vio.getLines(targetPath);
    let i = refactor.lineIndex(lines, '} from \'./index\';');
    lines.splice(i, 0, `  ${_.pascalCase(component)},`);
    i = refactor.lineIndex(lines, 'path: \'*\'');
    if (i === -1) {
      i = refactor.lastLineIndex(lines, /^ {2}]/);
    }
    lines.splice(i, 0, `    { path: '${urlPath}', name: '${args.pageName || _.upperFirst(_.lowerCase(component))}', component: ${_.pascalCase(component)}${args.isIndex ? ', isIndex: true' : ''} },`);
    vio.save(targetPath, lines);
  },

  removeFromRoute(feature, component) {
    assert.notEmpty(feature, 'feature');
    assert.notEmpty(component, 'component name');
    assert.featureExist(feature);

    const targetPath = utils.mapFeatureFile(feature, 'route.js');
    const lines = vio.getLines(targetPath);
    refactor.removeLines(lines, `  ${_.pascalCase(component)},`);
    const removed = refactor.removeLines(lines, new RegExp(`component: ${_.pascalCase(component)}[ ,}]`));
    vio.save(targetPath, lines);
    return removed;
  },

  moveRoute(source, dest) {
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
      const lines = this.removeFromRoute(source.feature, source.name);
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
      this.addToRoute(dest.feature, dest.name, urlPath, isIndex, name);
    }
  },

  addToActions(feature, name, actionFile) {
    feature = _.kebabCase(feature);
    name = _.camelCase(name);
    actionFile = _.camelCase(actionFile || name);

    const targetPath = utils.mapReduxFile(feature, 'actions');
    refactor.addExportFrom(targetPath, `./${actionFile}`, null, name);
  },

  removeFromActions(feature, name, actionFile) {
    name = _.camelCase(name);
    actionFile = _.camelCase(actionFile || name);
    const targetPath = utils.mapReduxFile(feature, 'actions');

    refactor.removeImportBySource(targetPath, `./${actionFile}`);
  },

  renameInActions(feature, oldName, newName) {
    // Rename export { xxx, xxxx } from './xxx'
    oldName = _.camelCase(oldName);
    newName = _.camelCase(newName);
    const targetPath = utils.mapReduxFile(feature, 'actions');
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.renameExportSpecifier(ast, oldName, newName, `./${oldName}`),
      refactor.renameModuleSource(ast, `./${oldName}`, `./${newName}`)
    ));
  },

  addToReducer(feature, action) {
    const targetPath = utils.mapReduxFile(feature, 'reducer');
    const camelActionName = _.camelCase(action);
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.addImportFrom(ast, `./${camelActionName}`, '', `reducer as ${camelActionName}Reducer`),
      refactor.addToArray(ast, 'reducers', `${camelActionName}Reducer`)
    ));
  },

  renameInReducer(feature, oldName, newName) {
    const targetPath = utils.mapReduxFile(feature, 'reducer');
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.renameImportAsSpecifier(ast, `${oldName}Reducer`, `${newName}Reducer`),
      refactor.renameModuleSource(ast, `./${oldName}`, `./${newName}`)
    ));
  },

  removeFromReducer(feature, action) {
    const targetPath = utils.mapReduxFile(feature, 'reducer');
    const camelActionName = _.camelCase(action);
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.removeImportBySource(ast, `./${camelActionName}`),
      refactor.removeFromArray(ast, 'reducers', `${camelActionName}Reducer`)
    ));
  },

  addToInitialState(feature, name, value) {
    const targetPath = utils.mapReduxFile(feature, 'initialState');
    refactor.addObjectProperty(targetPath, 'initialState', name, value);
  },

  removeFromInitialState(feature, name) {
    const targetPath = utils.mapReduxFile(feature, 'initialState');
    refactor.removeObjectProperty(targetPath, 'initialState', name);
  },

  renameInInitialState(feature, oldName, newName) {
    // Summary:
    //  Rename initial state property name.

    const targetPath = utils.mapReduxFile(feature, 'initialState');
    refactor.renameObjectProperty(targetPath, 'initialState', oldName, newName);
  },

  addToRootReducer(feature) {
    const targetPath = path.join(utils.getProjectRoot(), 'src/common/rootReducer.js');
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.addImportFrom(ast, `../features/${_.kebabCase(feature)}/redux/reducer`, `${_.camelCase(feature)}Reducer`),
      refactor.addObjectProperty(ast, 'reducerMap', _.camelCase(feature), `${_.camelCase(feature)}Reducer`)
    ));
  },

  renameInRootReducer(oldFeature, newFeature) {
    const targetPath = path.join(utils.getProjectRoot(), 'src/common/rootReducer.js');
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.renameImportSpecifier(ast, `${_.camelCase(oldFeature)}Reducer`, `${_.camelCase(newFeature)}Reducer`),
      refactor.renameObjectProperty(ast, 'reducerMap', _.camelCase(oldFeature), _.camelCase(newFeature)),
      refactor.renameModuleSource(ast, `../features/${_.kebabCase(oldFeature)}/redux/reducer`, `../features/${_.kebabCase(newFeature)}/redux/reducer`)
    ));
  },

  removeFromRootReducer(feature) {
    // NOTE: currently only used by feature
    const targetPath = path.join(utils.getProjectRoot(), 'src/common/rootReducer.js');
    refactor.updateFile(targetPath, ast => [].concat(
      refactor.removeImportBySource(ast, `../features/${_.kebabCase(feature)}/redux/reducer`),
      refactor.removeObjectProperty(ast, 'reducerMap', _.camelCase(feature))
    ));
  },

  addToRouteConfig(feature) {
    const targetPath = path.join(utils.getProjectRoot(), 'src/common/routeConfig.js');
    refactor.addImportLine(targetPath, `import ${_.camelCase(feature)}Route from '../features/${_.kebabCase(feature)}/route';`);
    const lines = vio.getLines(targetPath);
    let i = refactor.lineIndex(lines, 'path: \'*\'');
    // istanbul ignore if
    if (i === -1) {
      i = refactor.lastLineIndex(lines, /^ {2}]/);
    }
    lines.splice(i, 0, `    ${_.camelCase(feature)}Route,`);

    vio.save(targetPath, lines);
  },

  renameInRouteConfig(oldName, newName) {
    this.removeFromRouteConfig(oldName);
    this.addToRouteConfig(newName);
  },

  removeFromRouteConfig(feature) {
    const targetPath = path.join(utils.getProjectRoot(), 'src/common/routeConfig.js');
    refactor.removeImportLine(targetPath, `../features/${_.kebabCase(feature)}/route`);
    refactor.removeLines(targetPath, `    ${_.camelCase(feature)}Route,`);
  },

  addToRootStyle(feature) {
    const targetPath = path.join(utils.getProjectRoot(), 'src/styles/index.' + utils.getCssExt());
    refactor.addStyleImport(targetPath, `../features/${_.kebabCase(feature)}/style.${utils.getCssExt()}`);
  },

  removeFromRootStyle(feature) {
    const targetPath = path.join(utils.getProjectRoot(), 'src/styles/index.' + utils.getCssExt());
    refactor.removeStyleImport(targetPath, `../features/${_.kebabCase(feature)}/style.${utils.getCssExt()}`);
  },

  renameInRootStyle(oldName, newName) {
    const targetPath = path.join(utils.getProjectRoot(), 'src/styles/index.' + utils.getCssExt());
    refactor.renameStyleModuleSource(
      targetPath,
      `../features/${_.kebabCase(oldName)}/style.${utils.getCssExt()}`,
      `../features/${_.kebabCase(newName)}/style.${utils.getCssExt()}`
    );
  },
};
