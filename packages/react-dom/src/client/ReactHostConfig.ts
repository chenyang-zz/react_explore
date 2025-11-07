import { FiberNode } from 'react-reconciler/src/ReactFiber';
import { HostText } from 'react-reconciler/src/ReactWorkTags';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export function createInstance(type: string, props: any): Instance {
	const element = document.createElement(type);
	// TODO: 处理props
	const _ = props;
	return element;
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
