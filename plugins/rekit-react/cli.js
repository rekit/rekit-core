module.exports = {
  defineArgs({ addCmd }) {
    addCmd.addArgument(['--connect', '-c'], {
      help: 'Whether to connect to the Redux store. Only used for component.',
      action: 'storeTrue',
    });

    addCmd.addArgument(['--url-path', '-u'], {
      help: 'The url path added to react router config. Only used for page/component.',
      dest: 'urlPath',
    });

    addCmd.addArgument(['--async', '-a'], {
      help: 'Whether the action is async using redux-thunk.',
      action: 'storeTrue',
    });

    addCmd.addArgument(['--type', '-t'], {
      help: 'Component type, functional or class component.',
      dest: 'componentType',
      choices: ['functional', 'class'],
      defaultValue: 'functional',
    });

    addCmd.addArgument(['--hooks'], {
      help: 'If functional component, which hooks to include.',
      dest: 'hooks',
      defaultValue: [],
    });

    addCmd.addArgument(['--selector'], {
      help: 'In useAction, which store value to select.',
      dest: 'selector',
      defaultValue: [],
    });

    addCmd.addArgument(['--allow-auto-effect'], {
      help: 'Whether to allow auto effect when use the hook version of action',
      dest: 'allowAutoEffect',
      action: 'storeTrue',
      defaultValue: false,
    });
  },
};
