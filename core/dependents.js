const _ = require('lodash');

const getDependents = _.memoize(elementById => {
  const dependents = {};
  Object.values(elementById).forEach(ele => {
    if (ele.type === 'file' && ele.deps && ele.deps.length) {
      ele.deps.forEach(dep => {
        if (dep.type === 'file') {
          if (!dependents[dep.id]) dependents[dep.id] = [];
          dependents[dep.id].push(ele.id);
        }
      });
    }
  });
  return dependents;
});
module.exports = { getDependents };
