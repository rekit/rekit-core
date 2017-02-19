'use strict';

const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const vio = require('./vio');
const utils = require('./utils');

// Make sure it works in template
_.pascalCase = _.flow(_.camelCase, _.upperFirst);
_.upperSnakeCase = _.flow(_.snakeCase, _.toUpper);

function readTemplate(file) {
  file = path.isAbsolute(file) ? file : utils.joinPath(__dirname, '../templates', file);
  if (!shell.test('-e', file) && !vio.fileExists(file)) {
    utils.fatalError('Template file does\'t exist: ', file);
  }
  return vio.getContent(file);
}

function generate(targetPath, args) {
  if (!args.templateFile && !args.content && !args.template) {
    utils.fatalError('No template for generating' + targetPath + '.');
  }
  if (!args.force && (vio.fileExists(targetPath) || shell.test('-e', targetPath))) {
    utils.fatalError(`File already exists: ${targetPath}.`);
  }

  // What's content used for???
  let content = args.content;
  if (!content) {
    const tpl = args.template || readTemplate(args.templateFile);
    const compiled = _.template(tpl, args.templateOptions || {});
    content = compiled(args.context || {});
  }
  const lines = content.split(/\r?\n/);
  vio.save(targetPath, lines);
}

module.exports = {
  readTemplate,
  generate,
};
