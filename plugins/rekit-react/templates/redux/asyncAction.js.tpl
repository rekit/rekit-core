import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
  ${actionTypes.begin},
  ${actionTypes.success},
  ${actionTypes.failure},
  ${actionTypes.dismissError},
} from './constants';

export function ${ele.name}(args = {}) {
  return (dispatch) => { // optionally you can have getState as the second argument
    dispatch({
      type: ${actionTypes.begin},
    });

    const promise = new Promise((resolve, reject) => {
      const doRequest = args.error ? Promise.reject(new Error()) : Promise.resolve();
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

export function dismiss${utils.pascalCase(ele.name)}Error() {
  return {
    type: ${actionTypes.dismissError},
  };
}

export function use${utils.pascalCase(ele.name)}(${allowAutoEffect ? 'params' : ''}) {
  const dispatch = useDispatch();

  const { <% _.forEach(selector, p => print(p + ', ')) %>${ele.name}Pending, ${ele.name}Error } = useSelector(
    state => ({<%_.forEach(selector, p => print('\r\n      ' + p + ': state.' + ele.feature + '.' + p + ',')) %>
      ${ele.name}Pending: state.${ele.feature}.${ele.name}Pending,
      ${ele.name}Error: state.${ele.feature}.${ele.name}Error,
    }),
    shallowEqual,
  );

  const boundAction = useCallback((...args) => {
    dispatch(${ele.name}(...args));
  }, [dispatch]);<% if (allowAutoEffect) { %>

  useEffect(() => {
    if (params) boundAction(...(params || []));
  }, [...(params || []), boundAction]); // eslint-disable-line<% } %>

  const boundDismissError = useCallback(() => {
    dispatch(dismiss${utils.pascalCase(ele.name)}Error());
  }, [dispatch]);

  return {<% selector.forEach(p => print('\r\n    ' + p + ','))%>
    ${ele.name}: boundAction,
    ${ele.name}Pending,
    ${ele.name}Error,
    dismiss${utils.pascalCase(ele.name)}Error: boundDismissError,
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case ${actionTypes.begin}:
      // Just after a request is sent
      return {
        ...state,
        ${ele.name}Pending: true,
        ${ele.name}Error: null,
      };

    case ${actionTypes.success}:
      // The request is success
      return {
        ...state,
        ${ele.name}Pending: false,
        ${ele.name}Error: null,
      };

    case ${actionTypes.failure}:
      // The request is failed
      return {
        ...state,
        ${ele.name}Pending: false,
        ${ele.name}Error: action.data.error,
      };

    case ${actionTypes.dismissError}:
      // Dismiss the request failure error
      return {
        ...state,
        ${ele.name}Error: null,
      };

    default:
      return state;
  }
}
