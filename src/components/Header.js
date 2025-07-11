import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext'; // Import the context hook
import './Header.css';

const Header = () => {
    const { dispatch } = useTournament(); // Get the dispatch function
    const navigate = useNavigate(); // Get the navigate function

    // New handler to reset the app state and go to the homepage
    const handleStartOver = (e) => {
        e.preventDefault(); // Prevent the default link behavior
        dispatch({ type: 'RESET_STATE' });
        navigate('/');
    };

    return (
        <header className="app-header">
            <div className="header-title">
                {/* The main title link now also resets the state */}
                <a href="/" onClick={handleStartOver} className="header-title-link">
                    <h1>Tournament Scheduler</h1>
                </a>
            </div>

            <nav className="nav-steps">
                {/* The "Setup" link is now an <a> tag with the onClick handler */}
                <a href="/" onClick={handleStartOver} className="nav-step">1. Setup</a>
                <NavLink to="/divisions" className="nav-step">2. Divisions</NavLink>
                <NavLink to="/schedule" className="nav-step">3. View Schedule</NavLink>
            </nav>
        </header>
    );
};

export default Header;