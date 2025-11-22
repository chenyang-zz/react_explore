// 递归中的递阶段

// 职责
// 更新状态最新值
// 创造子FiberNode

import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './ReactFiber';
import { processUpdateQueue, type UpdateQueue } from './ReactUpdateQueue';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './ReactWorkTags';
import { mountChildFibers, reconcileChildFibers } from './ReactChildFiber';
import { renderWithHooks } from './ReactFiberHooks';
import type { Lane } from './ReactFiberLane';
import { Ref } from './ReactFiberFlags';

export function beginWork(wip: FiberNode, renderLane: Lane): FiberNode | null {
	// 比较，返回子FiberNode

	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case Fragment:
			return updateFragmentComponent(wip);
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型', wip.tag);
			}
			return null;
	}
}

function updateFragmentComponent(wip: FiberNode) {
	const nextChildren = wip.pendingProps;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane);
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
	wip.memoizedState = memoizedState;

	const nextChildren = wip.memoizedState;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	markRef(wip.alternate, wip);
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function reconcileChildren(
	wip: FiberNode,
	children?: ReactElementType | ReactElementType[]
) {
	const current = wip.alternate;

	if (current !== null) {
		// update
		wip.child = reconcileChildFibers(wip, current?.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref;

	// 两种情况
	// 1. mount时： ref存在
	// 2. update时： ref引用变化
	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProgress.flags |= Ref;
	}
}
