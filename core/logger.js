const fs = require('fs-extra');
const { createLogger, transports, format } = require('winston');
const stringify = require('fast-safe-stringify');
const paths = require('./paths');

const SPLAT = Symbol.for('splat');

fs.ensureDirSync(paths.configFile('logs'));
const myFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD hh:mm:ss.SSS',
  }),
  format.splat(),
  format.printf(info => {
    const splat = info[SPLAT];
    const ss = [];
    if (splat) {
      splat.forEach(s => {
        ss.push(s instanceof Error ? s.stack || s.message : stringify(s));
      });
    }
    return `[${info.timestamp}] ${info.label ? '[' + info.label + '] ' : ''}[${info.level}] ${
      info.message
    } ${ss.join(',')}`;
  }),
);

const myTransports = [
  new transports.File({
    filename: paths.configFile(`logs/rekit.log`),
    maxsize: 1000000,
    maxFiles: 5,
    handleExceptions: true,
  }),
  new transports.Console({
    handleExceptions: true,
  }),
];

const logger = createLogger({
  level: 'info',
  exitOnError: false,
  format: myFormat,
  splat: true,
  transports: myTransports,
});

module.exports = logger;
