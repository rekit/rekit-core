'use strict';

/**
 * Template manager. A simple wrapper of lodash template for using vio internally.
 * @module
 **/

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const vio = require('./vio');
const plugin = require('./plugin');
const paths = require('./paths');
const config = require('./config');

// Make sure it works in template
_.pascalCase = _.flow(
  _.camelCase,
  _.upperFirst,
);
_.upperSnakeCase = _.flow(
  _.snakeCase,
  _.toUpper,
);

function getTemplatePath(templateFile) {
  if (path.isAbsolute(templateFile)) return templateFile;
  const [pluginName, tplFile] = templateFile.split(':');

  const p = plugin.getPlugin(pluginName);
  if (!p) throw new Error('Unknown template file: ' + templateFile + ' because plugin not found.');
  if (!p.root) throw new Error('No phsical dir of the plugin: ' + pluginName);
  const tplDir1 = path.join(p.root, 'core/templates');
  const tplDir2 = path.join(p.root, 'templates'); // for built-in core plugins
  const pluginTplDir = fs.existsSync(tplDir1) ? tplDir1 : tplDir2;
  let customTplDir = config.getRekitConfig().templateDir;
  if (customTplDir && !path.isAbsolute(customTplDir)) customTplDir = paths.map(customTplDir);
  if (!customTplDir) customTplDir = paths.map('rekit-templates/' + pluginName);

  let realTplFile;
  [customTplDir, pluginTplDir].some(d => {
    // First find user customized template, then find plugin template
    const f = path.join(d, tplFile);
    if (fs.existsSync(f)) {
      realTplFile = f;
      return true;
    }
    return false;
  });
  if (!realTplFile) throw new Error('Template file not found: ', templateFile);
  return realTplFile;
}

/**
 * Process the template file and save the result to virtual IO.
 * If the target file has existed, throw fatal error and exit.
 *
 * @param {string} targetPath - The path to save the result.
 * @param {Object} args - The path to save the result.
 * @param {string} args.template - The template string to process.
 * @param {string} args.templateFile - If no 'template' defined, read the template file to process. One of template and templateFile should be provided.
 * @param {Object} args.context - The context to process the template.
 * @alias module:template.generate
 *
 * @example
 * const template = require('rekit-core').template;
 *
 * const tpl = 'hello ${user}!';
 * template.generate('path/to/result.txt', { template: tpl, context: { user: 'Nate' } });
 *
 * // Result => create a file 'path/to/result.txt' which contains text: 'hello Nate!'
 * // NOTE the result is only in vio, you need to call vio.flush() to write to disk.
 **/
function generate(targetPath, args) {
  if (!args.template && !args.templateFile) {
    throw new Error('No template or templateFile provided.');
  }
  if (args.throwIfExists && vio.fileExists(targetPath)) {
    throw new Error('File already exists: ' + targetPath);
  }
  const tpl = args.template || vio.getContent(getTemplatePath(args.templateFile));
  const compiled = _.template(tpl, args.templateOptions || {});
  const result = compiled(args.context || {});

  vio.save(targetPath, result);
}

module.exports = {
  generate,
};
