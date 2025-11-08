import { FiberNode } from 'react-reconciler/src/ReactFiber';
import { HostComponent, HostText } from 'react-reconciler/src/ReactWorkTags';
import { type DOMElement, updateFiberProps } from '../events/SyntheticEvent';
import type { Props } from 'shared/ReactTypes';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export function createInstance(type: string, props: Props): Instance {
	const element = document.createElement(type) as unknown;
	updateFiberProps(element as DOMElement, props);
	// TODO: 处理props
	const _ = props;
	return element as DOMElement;
}

export function appendInitialChild(parent: Instance, child: Instance) {
	parent.appendChild(child);
}

export function createTextInstance(content: string) {
	return document.createTextNode(content);
}

export function appendChildToContainer(child: Instance, container: Container) {
	container.appendChild(child);
}

export function commitUpdate(fiber: FiberNode) {
	switch (fiber.tag) {
		case HostText:
			const text = fiber.memoizedProps.content;
			return commitTextUpdate(fiber.stateNode, text);
		case HostComponent:
			return updateFiberProps(fiber.stateNode, fiber.memoizedProps);
		default:
			if (__DEV__) {
				console.warn('为实现的Update类型', fiber);
			}
			break;
	}
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
	textInstance.textContent = content;
}

export function removeChild(
	child: Instance | TextInstance,
	container: Container
) {
	container.removeChild(child);
}

export function insertChildToContainer(
	child: Instance,
	container: Container,
	before: Instance
) {
	container.insertBefore(child, before);
}
