import { scheduleMircoTask } from 'hostConfig';
import {
	createWorkInProcess,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects
} from './ReactFiber';
import { beginWork } from './ReactFiberBeginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitLayoutEffects,
	commitMutationEffects
} from './ReactFiberCommitWork';
import { completeWork } from './ReactFiberCompleteWork';
import { MutationMask, NoFlags, PassiveMask } from './ReactFiberFlags';
import {
	getHighestPriorityLane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane,
	type Lane
} from './ReactFiberLane';
import {
	flushSyncCallbacks,
	scheduleSyncCallback
} from './ReactFiberSyncTaskQueue';
import { HookHasEffect, Passive } from './ReactHookEffectTags';
import { HostRoot } from './ReactWorkTags';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_shouldYield as shouldYield,
	unstable_cancelCallback as cancelCallback,
	CallbackNode,
	type FrameCallbackType
} from 'scheduler';

let workInProcess: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects = false;

type RootExistStatus = number;
const RootInComplete = 1; // 中断执行
const RootCompleted = 2; // render阶段完成
// TODO: 执行过程中报错

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workInProcess = createWorkInProcess(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// TODO: 调度功能

	// fiberRootNode
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);

	ensureRootIsScheduled(root);
}

// schedule阶段入口
function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	const existingCallback = root.callbackNode;

	if (updateLane === NoLane) {
		if (existingCallback !== null) {
			cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const curPriority = updateLane;
	const prevPriority = root.callbackPriority;
	if (curPriority === prevPriority) {
		return;
	}

	// 存在更高的优先级

	if (existingCallback !== null) {
		cancelCallback(existingCallback);
	}

	let newCallbackNode: CallbackNode | null = null;

	if (__DEV__) {
		console.log(
			`在${
				updateLane === SyncLane ? '微' : '宏'
			}任务中调度，优先级：${updateLane}`
		);
	}

	if (updateLane === SyncLane) {
		// 同步优先级 用微任务调度
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		scheduleMircoTask(flushSyncCallbacks);
	} else {
		// 两种典型场景
		// 1. 时间切片
		// 2. 高优先级打断低优先级

		// 其他优先级 用宏任务调度
		const schedulerPriority = lanesToSchedulerPriority(updateLane);
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}

	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}

	throw new Error('未找到fiberRootNode');
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);
	if (nextLane !== SyncLane) {
		// 其他比SyncLane低的优先级
		// NoLane
		ensureRootIsScheduled(root);
		return;
	}

	const exitStatus = renderRoot(root, nextLane, false);

	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = nextLane;
		wipRootRenderLane = NoLane;

		// 根据 wip中的fiber树以及flag执行更新dom操作
		commitRoot(root);
		return;
	}
	if (__DEV__) {
		console.error('还未实现的更新结束状态');
	}
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): FrameCallbackType | void {
	// 保证 useEffect 回调执行
	const curCallback = root.callbackNode;
	const didFlushPassiveEffects = flushPassiveEffects(
		root.pendingPassiveEffects
	);
	if (didFlushPassiveEffects) {
		if (root.callbackNode !== curCallback) {
			return;
		}
	}

	const lane = getHighestPriorityLane(root.pendingLanes);
	const curCallbackNode = root.callbackNode;
	if (lane === NoLane) {
		return;
	}

	const needSync = lane === SyncLane || didTimeout;
	// render阶段
	const exitStatus = renderRoot(root, lane, !needSync);

	ensureRootIsScheduled(root);

	if (exitStatus === RootInComplete) {
		// 中断
		if (root.callbackNode !== curCallbackNode) {
			// 更高优先级的被调度
			return;
		}
		// 没有更高的优先级任务，当前任务在下一个时间片继续执行
		return performConcurrentWorkOnRoot.bind(null, root);
	}
	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = lane;
		wipRootRenderLane = NoLane;

		// 根据 wip中的fiber树以及flag执行更新dom操作
		commitRoot(root);
		return;
	}
	if (__DEV__) {
		console.error('还未实现的并发更新结束状态');
	}
}

function renderRoot(
	root: FiberRootNode,
	lane: Lane,
	shouldTimeSlice: boolean
): RootExistStatus {
	if (__DEV__) {
		console.warn(`开始${shouldTimeSlice ? '并发' : '同步'}render`, root);
	}

	// render阶段
	// beginwork
	// completeWork

	if (wipRootRenderLane !== lane) {
		// 初始化
		prepareFreshStack(root, lane);
	}

	do {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (e) {
			if (__DEV__) {
				console.error('workLoop发送错误', e);
			}
			workInProcess = null;
		}
	} while (true);

	// 中断执行 或者 render阶段完成

	// 中断执行
	if (shouldTimeSlice && workInProcess !== null) {
		return RootInComplete;
	}
	if (!shouldTimeSlice && workInProcess !== null && __DEV__) {
		console.error('同步render阶段结束时，workInProcess不应该存在');
	}
	// TODO: 报错

	// render阶段完成
	return RootCompleted;
}

function commitRoot(root: FiberRootNode) {
	// commit阶段
	// beforeMutation
	// mutation
	// layout
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn('commit阶段开始', finishedWork);
	}

	const lane = root.finishedLane;
	if (lane === NoLane && __DEV__) {
		console.error('commit阶段finishedLane不应该是NoLane');
	}

	// 重置
	root.finishedWork = null;
	root.finishedLane = NoLane;

	markRootFinished(root, lane);

	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// 调度副作用
			scheduleCallback(NormalPriority, () => {
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	// 判断是否存在3个子阶段需要执行的操作
	// root flags root subtreeFlags
	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (rootHasEffect || subtreeHasEffect) {
		// 阶段1: beforeMutation

		// 阶段2: mutation
		// mutation (Placement)
		commitMutationEffects(finishedWork, root);

		// fiber树切换
		root.current = finishedWork;

		// 阶段3: layout
		commitLayoutEffects(finishedWork, root);
	} else {
		root.current = finishedWork;
	}

	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	let didFlushPassiveEffects = false;
	pendingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffects = true;
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffects = true;
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffects = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];

	flushSyncCallbacks();
	return didFlushPassiveEffects;
}

function workLoopSync() {
	while (workInProcess !== null) {
		performUnitOfWork(workInProcess);
	}
}

function workLoopConcurrent() {
	while (workInProcess !== null && !shouldYield()) {
		performUnitOfWork(workInProcess);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane);
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
