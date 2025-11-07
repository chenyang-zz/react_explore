import { useState } from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('root');

function Child() {
	return <span>explore react</span>;
}

function App() {
	const [num, setNum] = useState(100);
	console.log(num);

	window.setNum = setNum;
	return (
		<div>
			<span>{num === 3 ? <Child /> : num}</span>
		</div>
	);
}

ReactDOM.createRoot(root).render(<App />);

// console.log(React);
// console.log(jsx);
console.log(ReactDOM);
