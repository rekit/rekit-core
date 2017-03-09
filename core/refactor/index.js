'use strict';

const common = require('./common');
const array = require('./array');
const importExport = require('./importExport');
const object = require('./object');
const style = require('./style');
const string = require('./string');
const cls = require('./cls');
const func = require('./func');
const lines = require('./lines');

module.exports = {
  // Common
  updateSourceCode: common.updateSourceCode,
  updateFile: common.updateFile,
  isLocalModule: common.isLocalModule,
  isSameModuleSource: common.isSameModuleSource,
  resolveModulePath: common.resolveModulePath,
  acceptFilePathForAst: common.acceptFilePathForAst,
  acceptFilePathForLines: common.acceptFilePathForLines,

  // Class
  renameClassName: cls.renameClassName,

  // Function
  renameFunctionName: func.renameFunctionName,

  // Array
  addToArrayByNode: array.addToArrayByNode,
  removeFromArrayByNode: array.removeFromArrayByNode,
  addToArray: array.addToArray,
  removeFromArray: array.removeFromArray,

  // Import export
  addImportFrom: importExport.addImportFrom,
  addExportFrom: importExport.addExportFrom,

  renameImportSpecifier: importExport.renameImportSpecifier,
  renameImportAsSpecifier: importExport.renameImportAsSpecifier,
  renameExportSpecifier: importExport.renameExportSpecifier,

  removeImportSpecifier: importExport.removeImportSpecifier,
  removeImportBySource: importExport.removeImportBySource,

  renameModuleSource: importExport.renameModuleSource,

  // Object
  addObjectProperty: object.addObjectProperty,
  setObjectProperty: object.setObjectProperty,
  renameObjectProperty: object.renameObjectProperty,
  removeObjectProperty: object.removeObjectProperty,

  // Style
  renameCssClassName: style.renameCssClassName,
  addStyleImport: style.addStyleImport,
  removeStyleImport: style.removeStyleImport,
  renameStyleImport: style.renameStyleImport,

  // String
  renameStringLiteral: string.renameStringLiteral,
  replaceStringLiteral: string.replaceStringLiteral,

  // Lines
  lineIndex: lines.lineIndex,
  lastLineIndex: lines.lastLineIndex,
  removeLines: lines.removeLines,
};


// const old = require('./old');

// module.exports = {

//   isActionEntry: old.isActionEntry,
//   isFeatureIndex: old.isFeatureIndex,
//   getEntryData: old.getEntryData,

//   addImportFrom: old.addImportFrom,
//   addExportFrom: old.addExportFrom,
//   addToArray: old.addToArray,
//   removeFromArray: old.removeFromArray,

//   addObjectProperty: old.addObjectProperty,
//   setObjectProperty: old.setObjectProperty,
//   renameObjectProperty: old.renameObjectProperty,
//   removeObjectProperty: old.removeObjectProperty,

//   renameClassName: old.renameClassName,
//   renameFunctionName: old.renameFunctionName,
//   renameImportSpecifier: old.renameImportSpecifier,
//   renameImportAsSpecifier: old.renameImportAsSpecifier,
//   renameExportSpecifier: old.renameExportSpecifier,
//   renameCssClassName: old.renameCssClassName,
//   renameStringLiteral: old.renameStringLiteral,
//   renameModuleSource: old.renameModuleSource,

//   replaceStringLiteral: old.replaceStringLiteral,

//   removeImportSpecifier: old.removeImportSpecifier,
//   removeImportBySource: old.removeImportBySource,

//   addToArrayByNode: old.addToArrayByNode,
//   removeFromArrayByNode: old.removeFromArrayByNode,

//   getCodeByNode: old.getCodeByNode,
//   updateSourceCode: old.updateSourceCode,
//   updateFile: old.updateFile,
//   objExpToObj: old.objExpToObj,

//   getRekitProps: old.getRekitProps,
//   getFeatures: old.getFeatures,
//   getFeatureStructure: old.getFeatureStructure,
//   getDeps: old.getDeps,
//   getSrcFiles: old.getSrcFiles,

//   nearestCharBefore: old.nearestCharBefore,
//   nearestCharAfter: old.nearestCharAfter,

//   lineIndex: old.lineIndex,
//   lastLineIndex: old.lastLineIndex,
//   addImportLine: old.addImportLine,
//   removeImportLine: old.removeImportLine,
//   addStyleImport: old.addStyleImport,
//   removeStyleImport: old.removeStyleImport,
//   renameStyleModuleSource: old.renameStyleModuleSource,
//   removeLines: old.removeLines,
//   addExportFromLine: old.addExportFromLine,
//   removeExportFromLine: old.removeExportFromLine,
// };
