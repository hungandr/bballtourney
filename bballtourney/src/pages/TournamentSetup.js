// src/pages/TournamentSetup.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

const TournamentSetup = () => {
    const { state, dispatch } = useTournament();
    const navigate = useNavigate();

    // --- THIS IS THE CORRECT PLACEMENT ---
    // The useEffect hook must be inside the component function.
    // This will clear any old schedule data when the user returns to this page.
    useEffect(() => {
        dispatch({ type: 'CLEAR_SCHEDULE' });
    }, [dispatch]);
    // ------------------------------------

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // For number inputs, ensure we dispatch a number type, not a string
        const parsedValue = e.target.type === 'number' ? parseInt(value) || 0 : value;
        dispatch({
            type: 'UPDATE_SETTINGS',
            payload: { [name]: parsedValue },
        });
    };

    const goToNextStep = () => {
        navigate('/divisions');
    };

    return (
        <div className="page-card">
            <h2>1. Tournament Parameters</h2>
            <div className="form-group">
                <label htmlFor="courts">Number of Courts</label>
                <input
                    type="number"
                    id="courts"
                    name="courts"
                    value={state.settings.courts}
                    onChange={handleInputChange}
                    min="1"
                />
            </div>
            <div className="form-group">
                <label htmlFor="days">Number of Days</label>
                <input
                    type="number"
                    id="days"
                    name="days"
                    value={state.settings.days}
                    onChange={handleInputChange}
                    min="1"
                />
            </div>
            <div className="form-group">
                <label htmlFor="gameDuration">Time per Game (minutes)</label>
                <input
                    type="number"
                    id="gameDuration"
                    name="gameDuration"
                    value={state.settings.gameDuration}
                    onChange={handleInputChange}
                    step="5"
                    min="10"
                />
            </div>
            <div className="form-group">
                <label htmlFor="startTime">Start Time (first game)</label>
                <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={state.settings.startTime}
                    onChange={handleInputChange}
                />
            </div>
            <div className="form-group">
                <label htmlFor="endTime">End Time (last game starts)</label>
                <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={state.settings.endTime}
                    onChange={handleInputChange}
                />
            </div>
            <button onClick={goToNextStep}>Next: Set Up Divisions →</button>
        </div>
    );
};

export default TournamentSetup;