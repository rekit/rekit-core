global.__REKIT_NO_WATCH = true;

const paths = require('../core/paths');
const logger = require('../core/logger');
require('rekit-core');

paths.setProjectRoot(paths.join(__dirname, './test-prj'));
logger.configure({ silent: true });
