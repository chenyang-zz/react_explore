import React from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('root');

function Child() {
	return <span>explore react</span>;
}

function App() {
	return (
		<div>
			<Child />
		</div>
	);
}

ReactDOM.createRoot(root).render(<App />);

console.log(React);
// console.log(jsx);
console.log(ReactDOM);
