import type { Dispatch } from 'react/src/ReactCurentDispatcher';
import type { Action } from 'shared/ReactTypes';
import type { Lane } from './ReactFiberLane';

export interface Update<State> {
	action: Action<State>;
	lane: Lane;
	next: Update<any> | null;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export function createUpdate<State>(
	action: Action<State>,
	lane: Lane
): Update<State> {
	return {
		action,
		lane,
		next: null
	};
}

export function createUpdateQueue<State>() {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<State>;
}

export function enqueueUpdate<State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) {
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		// pending = a -> a
		update.next = update;
	} else {
		// pending  b -> a -> b
		// pending c -> a -> b -> c
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
}

export function processUpdateQueue<State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): { memoizedState: State } {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};

	if (pendingUpdate !== null) {
		// 第一个update
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<State>;
		do {
			const updateLane = pending.lane;
			if (updateLane === renderLane) {
				// baseState 1 update 2 -> memoizedState 2
				// baseState 1 update (x) => 4x -> memoizedState 4
				const action = pendingUpdate.action;
				if (action instanceof Function) {
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.error('不应该进入 updateLane !== renderLane 逻辑');
				}
			}

			pending = pending?.next as Update<State>;
		} while (pending !== first);
	}

	result.memoizedState = baseState;
	return result;
}
