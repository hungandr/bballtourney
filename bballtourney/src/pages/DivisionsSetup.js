// src/pages/DivisionsSetup.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

// The URL of your backend API. Render will provide this.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const DivisionsSetup = () => {
    const { state, dispatch } = useTournament();
    const navigate = useNavigate();
    const [visibleTeamNames, setVisibleTeamNames] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { dispatch({ type: 'CLEAR_SCHEDULE' }); }, [dispatch]);

    const handleAddDivision = () => { dispatch({ type: 'ADD_DIVISION' }); };
    const handleRemoveDivision = (id) => { dispatch({ type: 'REMOVE_DIVISION', payload: { id } }); };

    const handleDivisionChange = (id, field, value) => {
        const data = field === 'numTeams' ? { [field]: parseInt(value) || 0 } : { [field]: value };
        dispatch({ type: 'UPDATE_DIVISION', payload: { id, data } });
    };

    const handleTeamNameChange = (divisionId, teamIndex, name) => {
        const division = state.divisions.find(d => d.id === divisionId);
        if (!division) return;
        const newTeamNames = [...division.teamNames];
        newTeamNames[teamIndex] = name;
        dispatch({ type: 'UPDATE_DIVISION', payload: { id: divisionId, data: { teamNames: newTeamNames } } });
    };

    const toggleTeamNamesVisibility = (divisionId) => {
        setVisibleTeamNames(prev => ({...prev, [divisionId]: !prev[divisionId]}));
    };

    const handleGenerateAndSaveSchedule = () => {
        setIsSaving(true);
        // Step 1: Generate the schedule in memory first. The useEffect below will handle the rest.
        dispatch({ type: 'GENERATE_SCHEDULE' });
    };

    // This effect runs after the state is updated by the dispatch above
    useEffect(() => {
        const saveSchedule = async () => {
            // Step 2: Check if schedule generation was successful (not null and no error)
            if (state.schedule && !state.schedule.error) {
                try {
                    const response = await fetch(`${API_URL}/api/tournaments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            settings: state.settings,
                            divisions: state.divisions,
                            schedule: state.schedule,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to save schedule to server.');
                    }

                    const savedTournament = await response.json();

                    // Step 3: Navigate to the new, unique, shareable URL
                    navigate(`/schedule/${savedTournament._id}`);

                } catch (error) {
                    console.error('Save error:', error);
                    alert(`Could not save the schedule. ${error.message}`);
                    setIsSaving(false);
                }
            } else if (state.schedule && state.schedule.error) {
                // If generation itself failed, navigate to the schedule page to show the error
                navigate('/schedule');
                setIsSaving(false);
            }
        };

        // Only trigger the save if `isSaving` is true.
        // This prevents this from running on every state.schedule change.
        if (isSaving) {
            saveSchedule();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.schedule, isSaving]); // Dependencies ensure this runs when needed


    return (
        <div className="page-card">
            <h2>2. Divisions Setup</h2>
            {state.divisions.map((division, index) => (
                <div key={division.id} className="page-card" style={{ border: '1px solid #ddd', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4>Division #{index + 1}: {division.name || 'Untitled'}</h4>
                        <button className="button-secondary" onClick={() => handleRemoveDivision(division.id)} disabled={isSaving}>
                            Remove Division
                        </button>
                    </div>
                    {/* The rest of the JSX is the same, just add 'disabled={isSaving}' to interactive elements */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div className="form-group">
                            <label htmlFor={`name-${division.id}`}>Division Name</label>
                            <input type="text" id={`name-${division.id}`} value={division.name} onChange={(e) => handleDivisionChange(division.id, 'name', e.target.value)} disabled={isSaving}/>
                        </div>
                        <div className="form-group">
                            <label htmlFor={`numTeams-${division.id}`}>Number of Teams</label>
                            <input type="number" id={`numTeams-${division.id}`} min="2" value={division.numTeams} onChange={(e) => handleDivisionChange(division.id, 'numTeams', e.target.value)} disabled={isSaving}/>
                        </div>
                    </div>
                    {/* ... other form elements ... */}
                    <div style={{marginTop: '2rem'}}>
                        <button onClick={handleAddDivision} style={{ marginRight: '1rem' }} disabled={isSaving}>
                            + Add Division
                        </button>
                        <button onClick={handleGenerateAndSaveSchedule} disabled={isSaving}>
                            {isSaving ? 'Generating & Saving...' : 'Generate & Save Schedule'}
                        </button>
                    </div>
                </div>
            ))}
            {/* Final Buttons if divisions array is empty */}
            {state.divisions.length === 0 && (
                <div style={{marginTop: '2rem'}}>
                    <button onClick={handleAddDivision} style={{ marginRight: '1rem' }} disabled={isSaving}>
                        + Add Division
                    </button>
                </div>
            )}
        </div>
    );
};

export default DivisionsSetup;