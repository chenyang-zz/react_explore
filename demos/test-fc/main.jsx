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
			? [<li>5</li>, <li>6</li>, <li>7</li>]
			: [<li>7</li>, <li>6</li>, <li>5</li>];

	return (
		<ul
			onClick={() => {
				setNum((num) => num + 1);
				setNum((num) => num + 1);
				setNum((num) => num + 1);
			}}
		>
			<>
				<li>1</li>
				<li>2</li>
			</>
			<li>3</li>
			<li>4</li>
			{arr}
			{num}
		</ul>
	);
}

ReactDOM.createRoot(root).render(<App />);

// console.log(React);
// console.log(jsx);
console.log(ReactDOM);
