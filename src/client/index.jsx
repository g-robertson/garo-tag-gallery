import App from './App';

const root = document.getElementById('root');

root.replaceChildren(...(<dom><App /></dom>));