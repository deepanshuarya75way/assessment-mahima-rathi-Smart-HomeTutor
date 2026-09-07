import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { getSocket } from './services/socket';
import './index.css';

// Ensure socket singleton is ready globally
getSocket();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
