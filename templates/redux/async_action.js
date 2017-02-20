import {
  ${actionTypes.begin},
  ${actionTypes.success},
  ${actionTypes.failure},
  ${actionTypes.dismissError},
} from './constants';

// Rekit uses redux-thunk for async actions by default: https://github.com/gaearon/redux-thunk
// If you prefer redux-saga, you can use rekit-plugin-redux-saga: https://github.com/supnate/rekit-plugin-redux-saga
export function ${_.camelCase(action)}(args = {}) {
  return (dispatch) => { // optionally you can have getState as the second argument
    dispatch({
      type: ${actionTypes.begin},
    });

    // Return a promise so that you could control UI flow without states in the store.
    // For example: after submit a form, you need to redirect the page to another when succeeds or show some errors message if fails.
    // It's hard to use state to manage it, but returning a promise allows you to easily achieve it.
    // e.g.: handleSubmit() { this.props.actions.submitForm(data).then(()=> {}).catch(() => {}); }
    const promise = new Promise((resolve, reject) => {
      // doRequest is a sample which resolves promise in 20ms. You should replace it with your own logic.
      // See the real-word example at:  https://github.com/supnate/rekit/blob/master/src/features/home/redux/fetchRedditReactjsList.js
      const doRequest = new Promise((resolve2, reject2) => setTimeout(() => (args.error ? reject2('error') : resolve2('success')), 20));
      doRequest.then(
        (res) => {
          dispatch({
            type: ${actionTypes.success},
            data: res,
          });
          resolve(res);
        },
        // Use rejectHandler as the second argument so that render errors won't be caught.
        (err) => {
          dispatch({
            type: ${actionTypes.failure},
            data: { error: err },
          });
          reject(err);
        },
      );
    });

    return promise;
  };
}

// Async action saves request error by default, this method is used to dismiss the error info.
// If you don't want errors to be saved in Redux store, just ignore this method.
export function dismiss${_.pascalCase(action)}Error() {
  return {
    type: ${actionTypes.dismissError},
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case ${actionTypes.begin}:
      // Just after a request is sent
      return {
        ...state,
        ${_.camelCase(action)}Pending: true,
        ${_.camelCase(action)}Error: null,
      };

    case ${actionTypes.success}:
      // The request is success
      return {
        ...state,
        ${_.camelCase(action)}Pending: false,
        ${_.camelCase(action)}Error: null,
      };

    case ${actionTypes.failure}:
      // The request is failed
      return {
        ...state,
        ${_.camelCase(action)}Pending: false,
        ${_.camelCase(action)}Error: action.data.error,
      };

    case ${actionTypes.dismissError}:
      // Dismiss the request failure error
      return {
        ...state,
        ${_.camelCase(action)}Error: null,
      };

    default:
      return state;
  }
}
