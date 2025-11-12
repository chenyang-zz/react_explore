import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('root');

function Child() {
	useEffect(() => {
		console.log('Child mount');
		return () => {
			console.log('Child unmount');
		};
	}, []);
	return <span>explore react</span>;
}

function App() {
	const [num, setNum] = useState(0);
	useEffect(() => {
		console.log('App mount');
	}, []);

	useEffect(() => {
		console.log('num change create', num);
		return () => {
			console.log('num change destroy', num);
		};
	}, [num]);
	return (
		<div onClick={() => setNum(num + 1)}>{num === 0 ? <Child /> : 'noop'}</div>
	);
}

ReactDOM.createRoot(root).render(<App />);

// console.log(React);
// console.log(jsx);
console.log(ReactDOM);
