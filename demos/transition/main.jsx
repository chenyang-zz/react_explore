import { useState, useEffect, useTransition } from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('root');

function TabButton({ action, children, isActive }) {
	const [isPending, startTransition] = useTransition();
	if (isActive) {
		return <b>{children}</b>;
	}
	if (isPending) {
		return <b className="pending">{children}</b>;
	}
	return (
		<button
			onClick={() => {
				startTransition(async () => {
					await action();
				});
			}}
		>
			{children}
		</button>
	);
}

function AboutTab() {
	return <p>Welcome to my profile!</p>;
}

function SlowPost({ index }) {
	let startTime = performance.now();
	while (performance.now() - startTime < 1) {
		// Do nothing for 1 ms per item to emulate extremely slow code
	}

	return <li className="item">Post #{index + 1}</li>;
}

function PostsTab() {
	let items = [];
	for (let i = 0; i < 500; i++) {
		items.push(<SlowPost key={i} index={i} />);
	}
	return <ul className="items">{items}</ul>;
}

function ContactTab() {
	return (
		<>
			<p>You can find me online here:</p>
			<ul>
				<li>admin@mysite.com</li>
				<li>+123456789</li>
			</ul>
		</>
	);
}

function App() {
	const [tab, setTab] = useState('about');
	return (
		<>
			<TabButton isActive={tab === 'about'} action={() => setTab('about')}>
				About
			</TabButton>
			<TabButton isActive={tab === 'posts'} action={() => setTab('posts')}>
				Posts (slow)
			</TabButton>
			<TabButton isActive={tab === 'contact'} action={() => setTab('contact')}>
				Contact
			</TabButton>
			<hr />
			{tab === 'about' && <AboutTab />}
			{tab === 'posts' && <PostsTab />}
			{tab === 'contact' && <ContactTab />}
		</>
	);
}

ReactDOM.createRoot(root).render(<App />);
