export type Container = Element;
export type Instance = Element;

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
