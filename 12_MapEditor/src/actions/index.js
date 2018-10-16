import { createActions } from 'redux-actions';

export default createActions(
  'INIT_ASYNCLATEST',
  'REDUCER_CHANGE',
  'REDUCER_BUSY',

  'VIEW_CHANGE',
  'SELECT_LEGEND_ASYNCLATEST',

  'READWELCOME_ASYNCLATEST',
  'READSQL_ASYNCLATEST',
  'READLOG_ASYNCLATEST',
  'READTEST_ASYNCLATEST',
  'EXPORTSVG_ASYNCLATEST'
);