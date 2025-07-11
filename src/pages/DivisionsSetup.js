import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { generateFullSchedule } from '../utils/scheduleGenerator';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const DivisionsSetup = () => {
    const { state, dispatch } = useTournament();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);

    const handleAddDivision = (type) => {
        dispatch({ type: 'ADD_DIVISION', payload: { type } });
    };

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

    const handleGenerateAndSaveSchedule = async () => {
        setIsSaving(true);
        const newSchedule = generateFullSchedule(state);

        if (newSchedule.error) {
            alert(`Scheduling Failed: ${newSchedule.error}`);
            setIsSaving(false);
            return;
        }

        const tournamentData = {
            settings: state.settings,
            divisions: state.divisions,
            schedule: newSchedule,
        };

        try {
            const response = await fetch(`${API_URL}/api/tournaments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tournamentData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save schedule to server.');
            }
            const savedTournament = await response.json();
            dispatch({ type: 'SET_FULL_STATE', payload: savedTournament });
            navigate(`/schedule/${savedTournament._id}`);
        } catch (error) {
            console.error('Save error:', error);
            alert(`Could not save the schedule. ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-card page-card--wide">
            <h2>2. Divisions Setup</h2>
            {state.divisions.map((division, index) => (
                <div key={division.id} className="page-card" style={{ border: '1px solid #ddd', marginTop: '1rem', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        {/* --- THIS LINE IS UPDATED TO PROVIDE A DEFAULT --- */}
                        <h4>Division #{index + 1}: {division.name || 'Untitled'} ({division.divisionType || 'Pool Play'})</h4>
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

                    <div style={{marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
                        <h4 style={{marginTop: 0, marginBottom: '1rem'}}>Team Names</h4>
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
                </div>
            ))}
            <div style={{marginTop: '2rem'}}>
                <button onClick={() => handleAddDivision('Pool Play')} style={{ marginRight: '1rem' }} disabled={isSaving}>
                    + Add Pool Play
                </button>
                <button onClick={() => handleAddDivision('Championship')} style={{ marginRight: '1rem' }} className="button-secondary" disabled={isSaving}>
                    + Add Championship
                </button>
                <button onClick={() => handleAddDivision('Consolation')} style={{ marginRight: '1rem' }} className="button-secondary" disabled={isSaving}>
                    + Add Consolation
                </button>
            </div>
            <div style={{marginTop: '2rem', borderTop: '2px solid #1976d2', paddingTop: '2rem'}}>
                <button onClick={handleGenerateAndSaveSchedule} disabled={isSaving}>
                    {isSaving ? 'Generating & Saving...' : 'Generate & Save Schedule'}
                </button>
            </div>
        </div>
    );
};

export default DivisionsSetup;