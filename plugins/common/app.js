const { files, paths } = rekit.core;

function getProjectData(args = {}) {
  return files.readDir(paths.getProjectRoot(), { force: args.force });
}

function canOpen(prjDir) {
  return true;
}

module.exports = {
  getProjectData,
  canOpen,
};
