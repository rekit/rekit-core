const { files, paths } = rekit.core;

function getProjectData(args = {}) {
  return files.readDir(paths.getProjectRoot(), { force: args.force });
}

module.exports = {
  getProjectData,
};
