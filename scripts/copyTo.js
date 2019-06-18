/* This script is used to copy SDK pkg to a plugin project to test if SDK works. */

const fs = require('fs-extra');
const path = require('path');

// build sdk first

let destPrj = process.argv[2];
if (!path.isAbsolute(destPrj)) destPrj = path.join(process.cwd(), destPrj);

const dest = path.join(destPrj, 'node_modules/rekit-core');

if (!fs.existsSync(dest)) {
  throw new Error('Dest folder not exists: ' + dest);
}
const src = path.join(__dirname, '..');

fs.copySync(src, dest, {
  filter(srcFile) {
    return !/node_modules|package\.json|\.git/.test(srcFile);//src.includes('node_modules');
  }
})
console.log('Done. SDK copied to: ', dest);