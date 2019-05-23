global.__REKIT_NO_WATCH = true;
const rekit = require('./index.js');
const { refactor, vio, app } = rekit.core;

console.log(app.getAppTypes());
// if (vio.fileExists('test2.js')) {
//   vio.move('test2.js', 'test3.js');
//   refactor.updateRefs('test2.js', 'test3.js');
// } else {
//   vio.move('test3.js', 'test2.js');
//   refactor.updateRefs('test3.js', 'test2.js');
// }

// vio.flush();
