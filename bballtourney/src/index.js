// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TournamentProvider } from './context/TournamentContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <TournamentProvider>
            <App />
        </TournamentProvider>
    </React.StrictMode>
);