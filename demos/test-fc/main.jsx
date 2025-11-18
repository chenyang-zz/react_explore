import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('root');

function Child({ children }) {
	const now = performance.now();
	while (performance.now() - now < 0.5) {}
	return <li>{children}</li>;
}

function App() {
	const [num, setNum] = useState(100);
	return (
		<ul onClick={() => setNum(50)}>
			{new Array(num).fill(0).map((_, i) => {
				return <Child key={i}>{i}</Child>;
			})}
		</ul>
	);
}

ReactDOM.createRoot(root).render(<App />);

// console.log(React);
// console.log(jsx);
console.log(ReactDOM);
