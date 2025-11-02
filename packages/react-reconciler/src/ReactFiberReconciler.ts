import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './ReactFiber';
import { HostRoot } from './ReactWorkTags';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	type UpdateQueue
} from './ReactUpdateQueue';
import type { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop';

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}

export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	const hostRootFiber = root.current;
	const update = createUpdate<ReactElementType | null>(element);
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
		update
	);

	scheduleUpdateOnFiber(hostRootFiber);

	return element;
}
