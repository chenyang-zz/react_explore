import {
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_LowPriority as LowPriority,
	unstable_IdlePriority as IdlePriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_shouldYield as shouldYield,
	CallbackNode,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_cancelCallback as cancelCallback
} from 'scheduler';

import './style.css';
const button = document.querySelector('button');
const root = document.querySelector('#root');

type Priority =
	| typeof ImmediatePriority
	| typeof UserBlockingPriority
	| typeof NormalPriority
	| typeof LowPriority
	| typeof IdlePriority;

interface Task {
	count: number;
	priority: Priority;
}

const workList: Task[] = [];
let prevPriority: Priority = IdlePriority;

const prioritys = [
	LowPriority,
	NormalPriority,
	UserBlockingPriority,
	ImmediatePriority
] as Priority[];
prioritys.forEach((priority: Priority) => {
	const btn = document.createElement('button');
	root?.appendChild(btn);
	btn.innerText = [
		'',
		'ImmediatePriority',
		'UserBlockingPriority',
		'NormalPriority',
		'LowPriority'
	][priority];
	btn.onclick = () => {
		const task = {
			count: 100,
			priority
		};
		schedule(task);
	};
});

function schedule(task: Task) {
	const cbNode = getFirstCallbackNode();

	scheduleCallback(task.priority, preform.bind(null, task));
}

function preform(task: Task, didTimeout?: boolean): any {
	/**
	 * 1. work.priority
	 * 2. 时间切片
	 */
	const needSync = task.priority === ImmediatePriority || didTimeout;

	while ((needSync || !shouldYield()) && task.count) {
		task.count--;
		insertSpan(task.priority + '');
	}

	// 时间切片耗完，中断执行 || 执行完
	if (task.count !== 0) {
		// 中断执行
		return preform.bind(null, task);
	}
}

function insertSpan(content: string) {
	const span = document.createElement('span');
	span.innerText = '#';
	span.className = `pri-${content}`;
	doSomeBusyWork(1000000);
	root?.appendChild(span);
}

function doSomeBusyWork(len: number) {
	let result = 0;
	while (len--) {
		result += len;
	}
}
