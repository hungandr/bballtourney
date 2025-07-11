import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import TournamentSetup from './pages/TournamentSetup';
import DivisionsSetup from './pages/DivisionsSetup';
import ScheduleView from './pages/ScheduleView';

const API_URL = process.env.REACT_APP_API_URL || ''; // Use relative path for unified build

function App() {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLatestSchedule = async () => {
            try {
                const response = await fetch(`${API_URL}/api/tournaments/latest`);

                if (response.ok) {
                    const latestTournament = await response.json();
                    if (latestTournament?._id) {
                        navigate(`/schedule/${latestTournament._id}`);
                    }
                }
            } catch (error) {
                console.error('Could not fetch the latest schedule:', error);
            }
        };

        if (location.pathname === '/') {
            fetchLatestSchedule();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);


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