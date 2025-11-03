import { useState } from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('root');

function Child() {
	const [num] = useState(100);
	return <span>{num}</span>;
}

function App() {
	return (
		<div>
			<Child />
		</div>
	);
}

ReactDOM.createRoot(root).render(<App />);

// console.log(React);
// console.log(jsx);
console.log(ReactDOM);
