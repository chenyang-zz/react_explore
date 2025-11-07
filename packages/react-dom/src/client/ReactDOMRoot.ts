import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/ReactFiberReconciler';
import type { Container } from './ReactHostConfig';
import type { ReactElementType } from 'shared/ReactTypes';

export function createRoot(container: Container) {
	const root = createContainer(container);

	return {
		render(element: ReactElementType) {
			updateContainer(element, root);
		}
	};
}
