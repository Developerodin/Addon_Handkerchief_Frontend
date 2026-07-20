import { combineReducers } from '@reduxjs/toolkit';
import themeReducer from './reducer';
import { authReducer } from './reducers/authReducer';

const rootReducer = combineReducers({
  theme: themeReducer,
  auth: authReducer,
});

export default rootReducer;
