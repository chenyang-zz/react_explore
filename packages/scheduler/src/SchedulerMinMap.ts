export type Heap<T extends Node> = Array<T>;

export type Node = {
	id: number; // 任务的唯一标识
	sortIndex: number; // 任务的排序值
};

// 给堆添加元素
export function push<T extends Node>(heap: Heap<T>, node: T) {
	const index = heap.length;
	heap.push(node);
	// 调整最小堆，从下往上堆化
	siftUp(heap, node, index);
}

// 获取堆顶元素
export function peek<T extends Node>(heap: Heap<T>): T | null {
	return heap.length === 0 ? null : heap[0];
}

// 删除堆顶元素
export function pop<T extends Node>(heap: Heap<T>): T | null {
	if (heap.length === 0) {
		return null;
	}
	const first = heap[0];
	const last = heap.pop() as T;
	if (first !== last) {
		// 证明heap中有2个或者更多个元素
		heap[0] = last;
		siftDown(heap, last, 0);
	}

	return first;
}

// 从下往上堆化
function siftUp<T extends Node>(heap: Heap<T>, node: T, i: number) {
	let index = i;
	while (index > 0) {
		const parentIndex = (index - 1) >>> 1;
		const parent = heap[parentIndex];
		if (compare(parent, node) > 0) {
			// node子节点更小，与父节点交换
			heap[parentIndex] = node;
			heap[index] = parent;
			index = parentIndex;
		} else {
			return;
		}
	}
}

// 从上往下堆化
function siftDown<T extends Node>(heap: Heap<T>, node: T, i: number) {
	let index = i;
	const length = heap.length;
	const halfLength = length >>> 1;
	while (index < halfLength) {
		const leftIndex = (index + 1) * 2 - 1;
		const left = heap[leftIndex];
		const rightIndex = leftIndex + 1;
		const right = heap[rightIndex]; // right不一定存在，需要判断是否存在
		if (compare(left, node) < 0) {
			// left < node
			if (rightIndex < length && compare(right, left) < 0) {
				// right存在，并且right更小
				heap[index] = right;
				heap[rightIndex] = node;
				index = rightIndex;
			} else {
				// left更小或者right不存在
				heap[index] = left;
				heap[leftIndex] = node;
				index = leftIndex;
			}
		} else if (rightIndex < length && compare(right, node) < 0) {
			// left >= node && right < node
			heap[index] = right;
			heap[rightIndex] = node;
			index = rightIndex;
		} else {
			// node最小, 不需要调整
			return;
		}
	}
}

function compare(a: Node, b: Node) {
	const diff = a.sortIndex - b.sortIndex;
	return diff !== 0 ? diff : a.id - b.id;
}
