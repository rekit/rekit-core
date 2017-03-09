'use strict';

const common = require('./common');
const array = require('./array');

module.exports = {
  updateSourceCode: common.updateSourceCode,

  addToArrayByNode: array.addToArrayByNode,
  removeFromArrayByNode: array.removeFromArrayByNode,
  addToArray: array.addToArray,
  removeFromArray: array.removeFromArray,
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
