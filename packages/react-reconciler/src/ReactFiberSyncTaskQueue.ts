let syncQueue: ((...args: any) => void)[] | null = null;
let isFlushingSyncQueue = false;

export function scheduleSyncCallback(callback: (...args: any) => void) {
	if (syncQueue === null) {
		syncQueue = [callback];
	} else {
		syncQueue.push(callback);
	}
}

export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			syncQueue.forEach((callback) => callback());
		} catch (e) {
			if (__DEV__) {
				console.error('flushSyncCallbacks发生错误', e);
			}
		} finally {
			isFlushingSyncQueue = false;
			syncQueue = [];
		}
	}
}

export const scheduleMircoTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => void) => Promise.resolve().then(callback)
		: setTimeout;
