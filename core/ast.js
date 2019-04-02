const _ = require('lodash');
const parser = require('@babel/parser');
const minimatch = require('minimatch');
const vio = require('./vio');
const logger = require('./logger');
const config = require('./config');

let cache = {};
const failedToParse = {};

function getAst(filePath, throwIfError) {
  const astFolders = config.getRekitConfig().astFolders || [];
  const excludeAstFolders = config.getRekitConfig().excludeAstFolders || [];

  if (
    (astFolders.length &&
      !astFolders.some(d => _.startsWith(filePath, d + '/') || minimatch(filePath, d))) ||
    excludeAstFolders.some(d => _.startsWith(filePath, d + '/') || minimatch(filePath, d))
  ) {
    return;
  }
  const checkAst = ast => {
    if (!ast && throwIfError) {
      throw new Error(`Failed to parse ast or file not exists, please check syntax: ${filePath}`);
    }
  };

  if (!vio.fileExists(filePath)) {
    checkAst(null);
    return null;
  }

  const code = vio.getContent(filePath);

  if (!cache[filePath] || cache[filePath].code !== code) {
    try {
      const ast = parser.parse(code, {
        // parse in strict mode and allow module declarations
        sourceType: 'module',
        plugins: [
          'jsx',
          'flow',
          'doExpressions',
          'objectRestSpread',
          'decorators-legacy',
          'classProperties',
          'exportExtensions',
          'asyncGenerators',
          'functionBind',
          'functionSent',
          'dynamicImport',
        ],
      });

      checkAst(ast);

      if (!ast) {
        failedToParse[filePath] = true;
        logger.warn(`Failed to parse ast, please check syntax: ${filePath}`);
        return null;
      }
      delete failedToParse[filePath];
      cache[filePath] = { ast, code };
      ast._filePath = filePath;
    } catch (e) {
      console.log('parse ast failed: ', e);
      checkAst(null);
      failedToParse[filePath] = true;
      logger.warn(`Failed to parse ast, please check syntax: ${filePath}`);
      return null;
    }
  }
  return cache[filePath].ast;
}

// function assertAst(ast, filePath) {
//   if (!ast) {
//     reset(); // eslint-disable-line
//     utils.fatalError(`Failed to parse ${filePath}, please fix and try again.`);
//   }
// }

function getFilesFailedToParse() {
  return failedToParse;
}

function clearCache(filePath) {
  if (filePath) delete cache[filePath];
  else cache = {};
}

module.exports = {
  getAst,
  clearCache,
  getFilesFailedToParse,
};
