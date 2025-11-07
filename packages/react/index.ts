// React

import { jsx } from './src/jsx';
import { Dispatcher, resolveDispatcher } from './src/ReactCuurentDispatcher';
import currentDispatcher from './src/ReactCuurentDispatcher';

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcjer: currentDispatcher
};

export const version = '0.0.0';
export const createElement = jsx;
