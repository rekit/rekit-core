// rename a module, should update all references
const path = require('path');

function updateRefs(src, dest) {
  console.log('updateRefs: ', src, dest);
  const app = require('../app');
  const refactor = require('./');
  const vio = require('../vio');
  const { elementById } = app.getProjectData();
  const dependents = require('../dependents').getDependents(elementById);
  const byId = id => elementById[id];
  if (!byId(src)) throw new Error(`Src element not exist: ${src}`);
  if (byId(dest)) throw new Error(`Dest element already exists: ${dest}`);

  dependents[src] &&
    dependents[src].forEach(id => {
      const ele = byId(id);
      // update module source to correct path
      refactor.renameModuleSource(ele.id, src, dest);

      // If name changed, update the import specifier
      const oldName = path.basename(src).replace(/\.[^.]+$/, '');
      const newName = path.basename(dest).replace(/\.[^.]+$/, '');
      console.log(oldName, newName);
      if (oldName !== newName) {
        // Renamed
        refactor.renameImportSpecifier(ele.id, oldName, newName, dest);
      }
    });
}

module.exports = updateRefs;
