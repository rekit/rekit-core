import React<% if(hooks.length) { print(', { ' + hooks.join(', ') + ' }'); } %> from 'react';<%if (connect) {%>
import {} from './redux/hooks';<%}%>

export default function ${ele.name}() {
  return (
    <div className="${prefix}${_.kebabCase(ele.path)}">
      Component content: ${ele.path}
    </div>
  );
};
