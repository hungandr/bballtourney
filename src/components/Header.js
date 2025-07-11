import React from 'react';
import { NavLink } from 'react-router-dom'; // Changed from Link to NavLink
import './Header.css';

const Header = () => {
    return (
        <header className="app-header">
            <div className="header-title">
                <NavLink to="/" className="header-title-link">
                    <h1>Tournament Scheduler</h1>
                </NavLink>
            </div>

            {/* This is the new navigation bar */}
            <nav className="nav-steps">
                <NavLink to="/" end className="nav-step">1. Setup</NavLink>
                <NavLink to="/divisions" className="nav-step">2. Divisions</NavLink>
                <NavLink to="/schedule" className="nav-step">3. View Schedule</NavLink>
            </nav>
        </header>
    );
};

export default Header;