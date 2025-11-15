import { enableProfiling } from './SchedulerFutureFlags';
import { PriorityLevel } from './SchedulerPriorities';

const runIdCounter = 0;
const mainThreadIdCounter = 0;

const eventLog: Int32Array | null = null;

const TaskStartEvent = 1;
const TaskCompleteEvent = 2;
const TaskErrorEvent = 3;
const TaskCancelEvent = 4;
const TaskRunEvent = 5;
const TaskYieldEvent = 6;
const SchedulerSuspendEvent = 7;
const SchedulerResumeEvent = 8;

function logEvent(entries: Array<number | PriorityLevel>) {
	if (eventLog !== null) {
		// TODO:
	}
}

export function markSchedulerUnsuspended(ms: number) {
	if (enableProfiling) {
		if (eventLog !== null) {
			logEvent([SchedulerResumeEvent, ms * 1000, mainThreadIdCounter]);
		}
	}
}
