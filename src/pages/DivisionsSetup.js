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
        dispatch({ type: 'GENERATE_SCHEDULE' });
    };

    useEffect(() => {
        const saveSchedule = async () => {
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
                    navigate(`/schedule/${savedTournament._id}`);

                } catch (error) {
                    console.error('Save error:', error);
                    alert(`Could not save the schedule. ${error.message}`);
                    setIsSaving(false);
                }
            } else if (state.schedule && state.schedule.error) {
                navigate('/schedule');
                setIsSaving(false);
            }
        };

        if (isSaving) {
            saveSchedule();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.schedule, isSaving]);


    return (
        <div className="page-card">
            <h2>2. Divisions Setup</h2>
            {state.divisions.map((division, index) => (
                <div key={division.id} className="page-card" style={{ border: '1px solid #ddd', marginTop: '1rem', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4>Division #{index + 1}: {division.name || 'Untitled'}</h4>
                        <button className="button-secondary" onClick={() => handleRemoveDivision(division.id)} disabled={isSaving}>
                            Remove Division
                        </button>
                    </div>

                    <div className="form-grid-2-col">
                        <div className="form-group">
                            <label htmlFor={`name-${division.id}`}>Division Name</label>
                            <input type="text" id={`name-${division.id}`} value={division.name} onChange={(e) => handleDivisionChange(division.id, 'name', e.target.value)} disabled={isSaving}/>
                        </div>
                        <div className="form-group">
                            <label htmlFor={`numTeams-${division.id}`}>Number of Teams</label>
                            <input type="number" id={`numTeams-${division.id}`} min="2" value={division.numTeams} onChange={(e) => handleDivisionChange(division.id, 'numTeams', e.target.value)} disabled={isSaving}/>
                        </div>
                    </div>

                    <button className="button-secondary" style={{marginTop: '1rem'}} onClick={() => toggleTeamNamesVisibility(division.id)}>
                        {visibleTeamNames[division.id] ? 'Hide Team Names' : 'Name Teams'}
                    </button>

                    {visibleTeamNames[division.id] && (
                        <div style={{marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
                            {division.teamNames.map((teamName, teamIndex) => (
                                <div key={teamIndex} className="form-group">
                                    <label htmlFor={`teamName-${division.id}-${teamIndex}`}>Team #{teamIndex + 1} Name</label>
                                    <input
                                        type="text"
                                        id={`teamName-${division.id}-${teamIndex}`}
                                        value={teamName}
                                        onChange={(e) => handleTeamNameChange(division.id, teamIndex, e.target.value)}
                                        disabled={isSaving}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            <div style={{marginTop: '2rem'}}>
                <button onClick={handleAddDivision} style={{ marginRight: '1rem' }} disabled={isSaving}>
                    + Add Division
                </button>
                <button onClick={handleGenerateAndSaveSchedule} disabled={isSaving}>
                    {isSaving ? 'Generating & Saving...' : 'Generate & Save Schedule'}
                </button>
            </div>
        </div>
    );
};

export default DivisionsSetup;