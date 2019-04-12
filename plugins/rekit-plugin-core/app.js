
const getParentPlugin = () => rekit.core.plugin.getPlugin('rekit-react-core');
function getProjectData(args) {
  const pp = getParentPlugin();
  console.log('pp: ', pp);
  if (!pp) throw new Error('Plugin not found: rekit-react-core');
  const prjData = pp.getProjectData(args);
  return {
    elements: [],
    elementById: {},
  };
}
function getFileProps(...args) {
  return rekit.core.plugin.getPlugin('rekit-react-core').app.getFileProps(...args);
}

module.exports = {
  // getProjectData,
  getFileProps,
};