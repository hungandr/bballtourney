import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import TournamentSetup from './pages/TournamentSetup';
import DivisionsSetup from './pages/DivisionsSetup';
import ScheduleView from './pages/ScheduleView';

function App() {
    // The useEffect for automatically loading the latest schedule has been removed.

    return (
        <div className="App">
            <Header />
            <main>
                <Routes>
                    <Route path="/" element={<TournamentSetup />} />
                    <Route path="/divisions" element={<DivisionsSetup />} />
                    <Route path="/schedule" element={<ScheduleView />} />
                    <Route path="/schedule/:id" element={<ScheduleView />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;