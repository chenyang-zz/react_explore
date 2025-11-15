import {
	enableAlwaysYieldScheduler,
	enableProfiling,
	enableRequestPaint,
	frameYieldMs,
	lowPriorityTimeout,
	normalPriorityTimeout,
	userBlockingPriorityTimeout
} from './SchedulerFutureFlags';
import { peek, pop, push } from './SchedulerMinMap';
import {
	IdlePriority,
	ImmediatePriority,
	LowPriority,
	NoPriority,
	NormalPriority,
	PriorityLevel,
	UserBlockingPriority
} from './SchedulerPriorities';

type Callback = (arg: boolean) => Callback | void;
export type CallbackNode = Callback;

export type Task = {
	id: number;
	callback: Callback | null;
	priorityLevel: PriorityLevel;
	startTime: number;
	expirationTime: number;
	sortIndex: number;
	isQueued?: boolean;
};

let getCurrentTime: () => number | DOMHighResTimeStamp;
const hasPerformanceNow =
	typeof performance === 'object' && typeof performance.now === 'function';

if (hasPerformanceNow) {
	const localPerformance = performance;
	getCurrentTime = () => localPerformance.now();
} else {
	const localDate = Date;
	const initialTime = localDate.now();
	getCurrentTime = () => localDate.now() - initialTime;
}

// 最大31位整数。V8中32位系统的最大整数大小
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
const maxSigned31BitInt = 1073741823;

// 任务池，最小堆
const taskQueue: Array<Task> = []; // 没有延迟的任务
const timerQueue: Array<Task> = []; // 有延迟的任务

// 标记task的唯一性
let taskIdCounter = 1;
let currentTask: Task | null = null;
let currentPriorityLevel: PriorityLevel = NormalPriority;

// 是否暂停调度
let isSchedulerPaused = false;

// 任务的超时id，用于clearTimeout
let taskTimeoutID = -1;

// 是否有 work 在执行
let isPerformingWork = false;

// 主线程是否在调度
let isHostCallbackScheduled = false;

// 消息循环是否在执行
let isMessageLoopRunning = false;

// 是否有任务在倒计时
let isHostTimeoutScheduled = false;

// 如果主进程上有其他工作，Scheduler会周期性地产生线程，如用户事件。默认情况下，它每帧产生多次
// 它不会尝试与帧边界对齐，因为大多数任务都不会需要帧对齐；
// 对于那些需要帧边界对齐，使用requestAnimationFrame
let frameInterval = frameYieldMs; // 时间切片，这是一个时间段
let startTime = -1; // 记录时间切片的起始值

let needsPaint = false;

// 捕获本机api的本地引用，以防polyfill覆盖它们
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
const localClearTimeout =
	typeof clearTimeout === 'function' ? clearTimeout : null;
const localSetImmediate =
	typeof setImmediate !== 'undefined' ? setImmediate : null; // IE and Node.js + jsdom

function advanceTimers(currentTime: number) {
	// 检查不再延迟的任务并将其添加到队列中
	let timer = peek(timerQueue);
	while (timer !== null) {
		if (timer.callback === null) {
			// 定时器取消
			pop(timerQueue);
		} else if (timer.startTime < currentTime) {
			// 计时器触发，传输到任务队列
			pop(timerQueue);
			timer.sortIndex = timer.expirationTime;
			push(taskQueue, timer);
			if (enableProfiling) {
				// TODO: profiling
			}
		} else {
			// 剩余的计时器正在等待
			return;
		}
		timer = peek(timerQueue);
	}
}

function handleTimeout(currentTime: number) {
	isHostTimeoutScheduled = true;
	advanceTimers(currentTime);

	if (!isHostCallbackScheduled) {
		if (peek(taskQueue) !== null) {
			isHostCallbackScheduled = true;
			requestHostCallback();
		} else {
			const firstTimer = peek(timerQueue);
			if (firstTimer !== null) {
				requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
			}
		}
	}
}

function flushWork(initialTime: number) {
	if (enableProfiling) {
		// TODO: profiling
	}

	// 下次安排工作时，我们需要一个主机回调
	isHostCallbackScheduled = false;
	if (isHostTimeoutScheduled) {
		// 我们安排了一个暂停，但现在不需要了，取消它
		isHostTimeoutScheduled = false;
		cancelHostTimeout();
	}

	isPerformingWork = true;
	const previousPriorityLevel = currentPriorityLevel;
	try {
		if (enableProfiling) {
			// TODO: profiling
			return false;
		} else {
			return workLoop(initialTime);
		}
	} finally {
		currentTask = null;
		currentPriorityLevel = previousPriorityLevel;
		isPerformingWork = false;
		if (enableProfiling) {
			// TODO: profiling
		}
	}
}

// 有很多task，每个task都有一个callback，callback执行完了，就执行下一个task
// 一个work就是一个时间切片内执行的一些task
// 时间切片要循环，就是work要循环(loop)
// 返回为true，表示还有任务没有执行完，需要继续执行
function workLoop(initialTime: number) {
	let currentTime = initialTime;
	advanceTimers(currentTime);
	currentTask = peek(taskQueue);
	while (currentTask !== null) {
		if (!enableAlwaysYieldScheduler) {
			if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
				// 这个currentTask还没有过期，但是时间片已经到期
				break;
			}
		}

		const callback = currentTask.callback;
		if (typeof callback === 'function') {
			currentTask.callback = null;
			const currentPriority = currentTask.priorityLevel;
			const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
			if (enableProfiling) {
				// TODO: profiling
			}
			const continuationCallback = callback(didUserCallbackTimeout);
			currentTime = getCurrentTime();
			if (typeof continuationCallback === 'function') {
				// 如果返回一个continuation，立即退出主线程
				// 不管当前时间片还有多少剩余时间
				currentTask.callback = continuationCallback;
				if (enableProfiling) {
					// TODO: profiling
				}
				advanceTimers(currentTime);
				return true;
			} else {
				if (enableProfiling) {
					// TODO: profiling
				}
				if (currentTask === peek(taskQueue)) {
					pop(taskQueue);
				}
				advanceTimers(currentTime);
			}
		} else {
			pop(taskQueue);
		}
		currentTask = peek(taskQueue);
		if (enableAlwaysYieldScheduler) {
			if (currentTask === null || currentTask.expirationTime > currentTime) {
				// 这个currentTask还没有过期，我们向浏览器任务屈服
				break;
			}
		}
	}

	// 返回是否有额外的工作
	if (currentTask !== null) {
		return true;
	} else {
		const firstTimer = peek(timerQueue);
		if (firstTimer !== null) {
			requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
		}
		return false;
	}
}

function unstable_runWithPriority<T>(
	priorityLevel: PriorityLevel,
	eventHandler: () => T
): T {
	switch (priorityLevel) {
		case ImmediatePriority:
		case UserBlockingPriority:
		case NormalPriority:
		case LowPriority:
		case IdlePriority:
			break;
		default:
			priorityLevel = NormalPriority;
	}

	const previousPriorityLevel = currentPriorityLevel;
	currentPriorityLevel = priorityLevel;

	try {
		return eventHandler();
	} finally {
		currentPriorityLevel = previousPriorityLevel;
	}
}

function unstable_next<T>(eventHandler: () => T): T {
	let priorityLevel: PriorityLevel;
	switch (currentPriorityLevel) {
		case ImmediatePriority:
		case UserBlockingPriority:
		case NormalPriority:
			// 切换到正常优先级
			priorityLevel = NormalPriority;
			break;
		default:
			// 任何低于正常优先级的都应保持当前级别
			priorityLevel = currentPriorityLevel;
			break;
	}

	const previousPriorityLevel = currentPriorityLevel;
	currentPriorityLevel = priorityLevel;

	try {
		return eventHandler();
	} finally {
		currentPriorityLevel = previousPriorityLevel;
	}
}

function unstable_wrapCallback<T extends () => any>(callback: T): T {
	const parentPriorityLevel = currentPriorityLevel;
	return function (this: unknown, ...args: []) {
		// 这是runWithPriority的一个分支，为了性能而内联
		const previousPriorityLevel = currentPriorityLevel;
		currentPriorityLevel = parentPriorityLevel;
		try {
			return callback.apply(this, args);
		} finally {
			currentPriorityLevel = previousPriorityLevel;
		}
	} as T;
}

function unstable_pauseExecution() {
	isSchedulerPaused = true;
}

function unstable_continueExecution() {
	isSchedulerPaused = false;
	if (!isHostCallbackScheduled && !isPerformingWork) {
		isHostCallbackScheduled = true;
		requestHostCallback();
	}
}

function unstable_getFirstCallbackNode(): Task | null {
	return peek(taskQueue);
}

function unstable_cancelCallback(task: Task) {
	if (enableProfiling) {
		// TODO: profiling
	}

	// 空回调，表示任务已被取消。(不能从队列中删除，因为你不能从基于数组的堆队列中删除任意节点，除了第一个)
	task.callback = null;
}

// 任务调度器的入口函数
function unstable_scheduleCallback(
	priorityLevel: PriorityLevel,
	callback: Callback,
	options?: { delay: number }
): Task {
	const currentTime = getCurrentTime();

	let startTime;
	if (typeof options === 'object' && options !== null) {
		const delay = options.delay;
		if (typeof delay === 'number' && delay > 0) {
			startTime = currentTime + delay;
		} else {
			startTime = currentTime;
		}
	} else {
		startTime = currentTime;
	}

	let timeout;
	switch (priorityLevel) {
		case ImmediatePriority:
			// 立刻超时
			timeout = -1;
			break;
		case UserBlockingPriority:
			timeout = userBlockingPriorityTimeout;
			break;
		case IdlePriority:
			// 永远不会超时
			timeout = maxSigned31BitInt;
			break;
		case LowPriority:
			timeout = lowPriorityTimeout;
			break;
		case NormalPriority:
		default:
			timeout = normalPriorityTimeout;
			break;
	}

	const expirationTime = startTime + timeout;
	const newTask: Task = {
		id: taskIdCounter++,
		callback,
		priorityLevel,
		startTime,
		expirationTime,
		sortIndex: -1
	};

	if (enableProfiling) {
		newTask.isQueued = false;
	}

	if (startTime > currentTime) {
		// 延迟任务
		newTask.sortIndex = startTime;
		push(timerQueue, newTask);
	} else {
		newTask.sortIndex = expirationTime;
		push(taskQueue, newTask);

		if (enableProfiling) {
			// TODO: profiling
		}

		// 如果需要，调度一个主线程回调。
		// 如果正在调度，等待下一次交还控制权
		if (!isHostCallbackScheduled && !isPerformingWork) {
			isHostCallbackScheduled = true;
			requestHostCallback();
		}
	}

	return newTask;
}

function unstable_getCurrentPriorityLevel(): PriorityLevel {
	return currentPriorityLevel;
}

function performWorkUntilDeadline() {
	if (enableRequestPaint) {
		needsPaint = false;
	}

	if (isMessageLoopRunning) {
		const currentTime = getCurrentTime();
		// 跟踪启动时间，这样我们就可以测量主线程的长度已被阻塞
		startTime = currentTime;
		// 如果调度程序任务抛出，则退出当前浏览器任务
		// 可以观察到错误。
		//
		// 故意不使用try-catch，因为这会导致一些调试技术更难
		// 相反，如果‘ flushWork ’错误，那么‘ hasMoreWork ’将保持为true，继续工作循环
		let hasMoreWork = true;
		try {
			hasMoreWork = flushWork(currentTime);
		} finally {
			if (hasMoreWork) {
				//如果有更多的工作，在结束时安排下一个消息事件
				schedulePerformWorkUntilDeadline();
			} else {
				isMessageLoopRunning = false;
			}
		}
	}
}

let schedulePerformWorkUntilDeadline: () => void;
if (typeof localSetImmediate === 'function') {
	// Node.js和旧的IE
	//不像MessageChannel，它不会阻止Node.js进程退出
	// setImmediate 触发时间比 MessageChannel 更快（更接近微任务）
	schedulePerformWorkUntilDeadline = () => {
		localSetImmediate(performWorkUntilDeadline);
	};
} else if (typeof MessageChannel !== 'undefined') {
	// DOM和Worker环境
	// 相比于setTimeout， 它没有4ms的延迟，可以更快触发回调
	const channel = new MessageChannel();
	const port = channel.port2;
	channel.port1.onmessage = performWorkUntilDeadline;
	schedulePerformWorkUntilDeadline = () => {
		port.postMessage(null);
	};
} else {
	// 使用setTimeout兜底
	schedulePerformWorkUntilDeadline = () => {
		localSetTimeout!(performWorkUntilDeadline, 0);
	};
}

// 把控制器交还给主线程
function shouldYieldToHost() {
	const timeElapsed = getCurrentTime() - startTime;

	if (timeElapsed < frameInterval) {
		// 主线程被阻塞的时间很短
		// 小于单个帧，不交还控制权
		return false;
	}

	return true;
}

function requestPaint() {
	// 暂时没有
}

function forceFrameRate(fps: number) {
	if (fps < 0 || fps > 125) {
		console.error(
			'forceFrameRate takes a positive int between 0 and 125, ' +
				'forcing frame rates higher than 125 fps is not supported'
		);
		return;
	}
	if (fps > 0) {
		frameInterval = Math.floor(1000 / fps);
	} else {
		// 重置帧率
		frameInterval = frameYieldMs;
	}
}

function requestHostCallback() {
	if (!isMessageLoopRunning) {
		isMessageLoopRunning = true;
		schedulePerformWorkUntilDeadline();
	}
}

function requestHostTimeout(
	callback: (currentTime: number) => void,
	ms: number
) {
	taskTimeoutID = localSetTimeout!(() => {
		callback(getCurrentTime());
	}, ms);
}

function cancelHostTimeout() {
	localClearTimeout!(taskTimeoutID);
	taskTimeoutID = -1;
}

export {
	ImmediatePriority as unstable_ImmediatePriority,
	UserBlockingPriority as unstable_UserBlockingPriority,
	NormalPriority as unstable_NormalPriority,
	IdlePriority as unstable_IdlePriority,
	LowPriority as unstable_LowPriority,
	unstable_runWithPriority,
	unstable_next,
	unstable_scheduleCallback,
	unstable_cancelCallback,
	unstable_wrapCallback,
	unstable_getCurrentPriorityLevel,
	shouldYieldToHost as unstable_shouldYield,
	requestPaint as unstable_requestPaint,
	unstable_continueExecution,
	unstable_pauseExecution,
	unstable_getFirstCallbackNode,
	getCurrentTime as unstable_now,
	forceFrameRate as unstable_forceFrameRate
};
