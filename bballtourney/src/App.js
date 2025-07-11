// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext';
import TournamentSetup from './pages/TournamentSetup';
import DivisionsSetup from './pages/DivisionsSetup';
import ScheduleView from './pages/ScheduleView';
import './App.css'; // Your main stylesheet

function App() {
  return (
      <TournamentProvider>
        <Router>
          <div className="app-container">
            <header className="app-header">
              <h1>Tournament Scheduler</h1>
              <nav>
                <NavLink to="/">1. Setup</NavLink>
                <NavLink to="/divisions">2. Divisions</NavLink>
                <NavLink to="/schedule">3. Schedule</NavLink>
              </nav>
            </header>
            <main className="app-main">
              <Routes>
                <Route path="/" element={<TournamentSetup />} />
                <Route path="/divisions" element={<DivisionsSetup />} />
                {/* Route for when a schedule is generated in-session but not yet saved */}
                <Route path="/schedule" element={<ScheduleView />} />
                {/* NEW: Route for viewing a saved, shareable schedule */}
                <Route path="/schedule/:id" element={<ScheduleView />} />
              </Routes>
            </main>
          </div>
        </Router>
      </TournamentProvider>
  );
}

export default App;