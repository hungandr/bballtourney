import React from 'react';
import { NavLink } from 'react-router-dom';
import './Header.css';

const Header = () => {
    return (
        <header className="app-header">
            <div className="header-title">
                {/* This is now a simple link to the homepage */}
                <NavLink to="/" className="header-title-link">
                    <h1>Tournament Scheduler</h1>
                </NavLink>
            </div>

            <nav className="nav-steps">
                {/* These are all standard NavLinks now */}
                <NavLink to="/" end className="nav-step">1. Setup</NavLink>
                <NavLink to="/divisions" className="nav-step">2. Divisions</NavLink>
                <NavLink to="/schedule" className="nav-step">3. View Schedule</NavLink>
            </nav>
        </header>
    );
};

export default Header;