import { useCallback } from 'react';
import { useDispatch<% if(selector.length > 1) print(', useSelector, shallowEqual')%><% if(selector.length === 1) print(', useSelector')%> } from 'react-redux';
import {
  ${actionType},
} from './constants';

export function ${ele.name}() {
  return {
    type: ${actionType},
  };
}

export function use${_.pascalCase(ele.name)}() {
  const dispatch = useDispatch();<% if(selector.length > 1) { %>
  const { <%= selector.join(', ')%> } = useSelector(state => ({<% selector.forEach(p => print('\r\n    ' + p + ': state.' + ele.feature + '.' + p + ',')) %>
  }), shallowEqual);<% } %><% if(selector.length === 1) { %>
  const ${selector[0]} = useSelector(state => state.${ele.feature}.${selector[0]});<% } %>
  const boundAction = useCallback((...params) => dispatch(${ele.name}(...params)), [dispatch]);
  return { <% selector.forEach(p => print(p + ', ')) %>${ele.name}: boundAction };
}

export function reducer(state, action) {
  switch (action.type) {
    case ${actionType}:
      return {
        ...state,
      };

    default:
      return state;
  }
}
