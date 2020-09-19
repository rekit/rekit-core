const _ = require('lodash');
const plugin = require('./plugin');
const logger = require('./logger');

// function getElementTypes() {
//   const elementTypes = _.flatten(plugin.invoke('rekit.element.getDefinition'));

//   const elementByName = _.keyBy(elementTypes, 'name');
//   return elementByName;
// }

/*
Define an element:

{
  type: 'component',
  template: './templates/component.tpl',
  parent: '',
  actions: array, // add, remove, move, update
  args: {
    name: string,
    feature: string,
    cssTranspiler: string, // less | scss
    connect: boolean,
    url: string,
    effects: array,
  },
}
*/

function add(type, name, args) {
  logger.info(`Adding ${type}: `, name);
  plugin.invoke('rekit.element.beforeAdd', type, name, args);
  plugin.invoke('rekit.element.add', type, name, args);
  plugin.invoke('rekit.element.afterAdd', type, name, args);
}

function move(type, source, target, args) {
  logger.info(`Moving ${type}: `, source, target);
  plugin.invoke('rekit.element.beforeMove', type, source, target, args);
  plugin.invoke('rekit.element.move', type, source, target, args);
  plugin.invoke('rekit.element.afterMove', type, source, target, args);
}

function remove(type, name, args) {
  logger.info(`Revmoving ${type}: `, type);
  plugin.invoke('rekit.element.beforeRemove', type, name, args);
  plugin.invoke('rekit.element.remove', type, name, args);
  plugin.invoke('rekit.element.afterRemove', type, name, args);
}

function update(type, name, args) {
  logger.info(`Updating ${type}: `, name);
  plugin.invoke('rekit.element.beforeUpdate', type, name, args);
  plugin.invoke('rekit.element.update', type, name, args);
  plugin.invoke('rekit.element.afterUpdate', type, name, args);
}

module.exports = {
  add,
  move,
  remove,
  update,
};
