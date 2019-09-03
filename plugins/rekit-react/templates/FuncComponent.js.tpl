import React<% if(hooks.length) { print(', { ' + hooks.join(', ') + ' }'); } %> from 'react';
// import PropTypes from 'prop-types';<%if (connect) {%>
import {} from './redux/hooks';<%}%>

function ${ele.name}() {
  return (
    <div className="${prefix}${_.kebabCase(ele.path)}">
      Component content: ${ele.path}
    </div>
  );
};

// ${ele.name}.propTypes = {};
// ${ele.name}.defaultProps = {};

export default ${ele.name};
