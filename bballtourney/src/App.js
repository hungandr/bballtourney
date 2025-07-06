// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TournamentSetup from './pages/TournamentSetup';
import DivisionsSetup from './pages/DivisionsSetup';
import ScheduleView from './pages/ScheduleView';
import './App.css';

function App() {
  return (
      <Router>
        <div className="app-container">
          <header>
            <h1>Basketball Tournament Organizer</h1>
            <nav>
              <Link to="/">Tournament Setup</Link>
              <Link to="/divisions">Divisions</Link>
              <Link to="/schedule">Schedule</Link>
            </nav>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<TournamentSetup />} />
              <Route path="/divisions" element={<DivisionsSetup />} />
              <Route path="/schedule" element={<ScheduleView />} />
            </Routes>
          </main>
        </div>
      </Router>
  );
}

export default App;