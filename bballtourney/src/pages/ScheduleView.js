import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import './ScheduleView.css';

// The URL of your backend API.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function createAllPossibleTimeSlots(settings) {
    // ... function is unchanged, keep it as is ...
    const slots = [];
    const { courts, dayTimes, gameDuration } = settings;
    if (!dayTimes || !Array.isArray(dayTimes)) return [];
    const gameMinutes = parseInt(gameDuration);
    const timeToMinutes = (timeStr) => parseInt(timeStr.split(':')[0]) * 60 + parseInt(timeStr.split(':')[1]);
    dayTimes.forEach((daySetting, dayIndex) => {
        const day = dayIndex + 1;
        const startTotalMinutes = timeToMinutes(daySetting.startTime);
        const endTotalMinutes = timeToMinutes(daySetting.endTime);
        for (let court = 1; court <= courts; court++) {
            let currentTime = startTotalMinutes;
            while (currentTime <= endTotalMinutes) {
                const hours = Math.floor(currentTime / 60).toString().padStart(2, '0');
                const minutes = (currentTime % 60).toString().padStart(2, '0');
                slots.push({ day, time: `${hours}:${minutes}`, court });
                currentTime += gameMinutes;
            }
        }
    });
    return slots;
}

const ScheduleView = () => {
    const { state, dispatch } = useTournament();
    const { schedule, settings } = state;
    const { id: scheduleId } = useParams(); // Get the ID from the URL: /schedule/some-unique-id
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('division');
    const [fetchError, setFetchError] = useState(null);

    // This effect handles loading a shared schedule from the server
    useEffect(() => {
        const fetchTournament = async (id) => {
            setIsLoading(true);
            setFetchError(null);
            try {
                const response = await fetch(`${API_URL}/api/tournaments/${id}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Could not fetch schedule data.');
                }
                const data = await response.json();
                // Use our new action to load the entire state into the context
                dispatch({ type: 'SET_FULL_STATE', payload: data });
            } catch (err) {
                console.error("Fetch error:", err);
                setFetchError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (scheduleId) {
            // If there's an ID in the URL, but the state doesn't have a schedule for it yet, fetch it.
            // This prevents re-fetching if we just generated and navigated here.
            if (!state.schedule) {
                fetchTournament(scheduleId);
            }
        }
    }, [scheduleId, dispatch, state.schedule]);

    // --- Data Grouping Logic (useMemo hooks) are unchanged ---
    const sortedGamesForTable = useMemo(() => { /* ... */ }, [schedule]);
    const gamesByDivision = useMemo(() => { /* ... */ }, [schedule]);
    const gamesByCourt = useMemo(() => { /* ... */ }, [schedule, settings]);
    const gamesByDay = useMemo(() => { /* ... */ }, [schedule]);
    const gamesByTeam = useMemo(() => { /* ... */ }, [schedule]);
    // --- keep all useMemo hooks exactly as they were ---


    // --- New/Updated Render Logic ---
    if (isLoading) {
        return <div className="page-card"><h2>Loading Schedule...</h2></div>;
    }
    if (fetchError) {
        return (
            <div className="page-card error-card">
                <h2>Error Loading Schedule</h2>
                <p>{fetchError}</p>
                <button onClick={() => navigate('/')}>Start Over</button>
            </div>
        );
    }
    if (!schedule) {
        return (
            <div className="page-card">
                <h2>Schedule Not Found</h2>
                <p>A schedule has not been generated or loaded for this session.</p>
                <button onClick={() => navigate('/')}>Start Over</button>
            </div>
        );
    }
    if (schedule.error) {
        return (
            <div className="page-card error-card">
                <h2>Scheduling Error</h2>
                <p>{schedule.error}</p>
                <button onClick={() => navigate('/divisions')}>Go Back to Divisions</button>
            </div>
        );
    }
    if (schedule.games.length === 0) {
        return (
            <div className="page-card">
                <h2>Schedule</h2>
                <p>No games were generated. This might be because there are not enough teams or time slots.</p>
                <button onClick={() => navigate('/divisions')}>Go Back to Divisions</button>
            </div>
        );
    }

    // The rest of your return statement with the view switcher and tables remains unchanged.
    return (
        <div className="page-card">
            {/*... The entire view switcher and table rendering JSX ...*/}
        </div>
    );
};

export default ScheduleView;