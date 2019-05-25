module.exports = {
  defineArgs({ addCmd }) {

    // TODO: move to rekit-react plugin
    addCmd.addArgument(['--connect', '-c'], {
      help: 'Whether to connect to the Redux store. Only used for component.',
      action: 'storeTrue',
    });

    // TODO: move to rekit-react plugin
    addCmd.addArgument(['--url-path', '-u'], {
      help: 'The url path added to react router config. Only used for page/component.',
      dest: 'urlPath',
    });

    // TODO: move to rekit-react plugin
    addCmd.addArgument(['--async', '-a'], {
      help: 'Whether the action is async using redux-thunk.',
      action: 'storeTrue',
    });
  },
};
