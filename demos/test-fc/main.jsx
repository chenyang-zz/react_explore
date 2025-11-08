import { useState } from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('root');

function Child() {
	return <span>explore react</span>;
}

function App() {
	const [num, setNum] = useState(100);
	const arr =
		num % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];
	return (
		<div>
			<ul onClickCapture={() => setNum(num + 1)}>{arr}</ul>
		</div>
	);
}

ReactDOM.createRoot(root).render(<App />);

// console.log(React);
// console.log(jsx);
console.log(ReactDOM);
