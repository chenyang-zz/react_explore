import { createWorkInProcess, FiberNode, FiberRootNode } from './ReactFiber';
import { beginWork } from './ReactFiberBeginWorl';
import { completeWork } from './ReactFiberCompleteWork';
import { HostRoot } from './ReactWorkTags';

let workInProcess: FiberNode | null = null;

function prepareFreshStack(root: FiberRootNode) {
	workInProcess = createWorkInProcess(root.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// TODO: 调度功能

	// fiberRootNode
	const root = markUpdateFromFiberToRoot(fiber);

	renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

function renderRoot(root: FiberRootNode) {
	// 初始化
	prepareFreshStack(root);

	do {
		try {
			workLoop();
			break;
		} catch (e) {
			if (__DEV__) {
				console.error('workLoop发送错误', e);
			}
			workInProcess = null;
		}
	} while (true);

	// 根据 wip中的fiber树以及flag执行更新dom操作
	const finishedWork = root.current.alternate;
	// commitRoot(root);
}

function workLoop() {
	while (workInProcess !== null) {
		performUnitOfWork(workInProcess);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
	fiber.memoizedProps = fiber.pendingProps;

	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProcess = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		completeWork(node);
		const sibling = node.sibling;

		if (sibling !== null) {
			workInProcess = sibling;
			return;
		}

		node = node.return;
		workInProcess = node;
	} while (node !== null);
}
