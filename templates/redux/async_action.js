import {
  ${actionTypes.begin},
  ${actionTypes.success},
  ${actionTypes.failure},
  ${actionTypes.dismissError},
} from './constants';

// Rekit uses redux-thunk for async actions:
// https://github.com/gaearon/redux-thunk
export function ${_.camelCase(action)}(args = {}) {
  return (dispatch) => { // optionally you could have getState as the second parameter
    dispatch({
      type: ${actionTypes.begin},
    });

    // Return a promise so that you could control UI flow without states in the store.
    // For example: after submit a form, you need to redirect the page to another when succeeds or show some errors message if fails.
    // It's hard to use state to manage it, but returning a promise allows you to easily achieve it.
    // e.g.: handleSubmit() { this.props.actions.submitForm(data).then(()=> {}).catch(() => {}); }
    const promise = new Promise(async (resolve, reject) => {
      let res;
      try {
        // Below is just a demo of async operation, please replace it with your own.
        // 'args.error' here is only used for demo of error handling in tests, please also remove it and use your own.
        res = await new Promise((resolve2, reject2) => setTimeout(() => (args.error ? reject2('error') : resolve2('success')), 20));
      } catch (err) {
        dispatch({
          type: ${actionTypes.failure},
          data: { error: err },
        });
        reject(err);
        return;
      }

      // Put success action dispatch out of try/catch so that rendering errors are not converted to failure actions.
      dispatch({
        type: ${actionTypes.success},
        data: res,
      });
      resolve(res);
    });

    return promise;
  };
}

export function dismiss${_.pascalCase(action)}Error() {
  return {
    type: ${actionTypes.dismissError},
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case ${actionTypes.begin}:
      return {
        ...state,
        ${_.camelCase(action)}Pending: true,
        ${_.camelCase(action)}Error: null,
      };

    case ${actionTypes.success}:
      return {
        ...state,
        ${_.camelCase(action)}Pending: false,
        ${_.camelCase(action)}Error: null,
      };

    case ${actionTypes.failure}:
      return {
        ...state,
        ${_.camelCase(action)}Pending: false,
        ${_.camelCase(action)}Error: action.data.error,
      };

    case ${actionTypes.dismissError}:
      return {
        ...state,
        ${_.camelCase(action)}Error: null,
      };

    default:
      return state;
  }
}
