// src/pages/DivisionsSetup.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

const DivisionsSetup = () => {
    const { state, dispatch } = useTournament();
    const navigate = useNavigate();
    const [visibleTeamNames, setVisibleTeamNames] = useState({});

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

    const handleGenerateSchedule = () => {
        dispatch({ type: 'GENERATE_SCHEDULE' });
        navigate('/schedule');
    };

    return (
        <div className="page-card">
            <h2>2. Divisions Setup</h2>
            {state.divisions.map((division, index) => (
                <div key={division.id} className="page-card" style={{ border: '1px solid #ddd', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4>Division #{index + 1}: {division.name || 'Untitled'}</h4>
                        <button className="button-secondary" onClick={() => handleRemoveDivision(division.id)}>
                            Remove Division
                        </button>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div className="form-group">
                            <label htmlFor={`name-${division.id}`}>Division Name</label>
                            <input type="text" id={`name-${division.id}`} value={division.name} onChange={(e) => handleDivisionChange(division.id, 'name', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label htmlFor={`numTeams-${division.id}`}>Number of Teams</label>
                            <input type="number" id={`numTeams-${division.id}`} min="2" value={division.numTeams} onChange={(e) => handleDivisionChange(division.id, 'numTeams', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Game Type:</label>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="radio" name={`gameType-${division.id}`} value="Pool Play" checked={division.gameType === 'Pool Play'} onChange={(e) => handleDivisionChange(division.id, 'gameType', e.target.value)} />Pool Play</label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="radio" name={`gameType-${division.id}`} value="Consolation" checked={division.gameType === 'Consolation'} onChange={(e) => handleDivisionChange(division.id, 'gameType', e.target.value)} />Consolation</label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><input type="radio" name={`gameType-${division.id}`} value="Championship" checked={division.gameType === 'Championship'} onChange={(e) => handleDivisionChange(division.id, 'gameType', e.target.value)} />Championship</label>
                        </div>
                    </div>
                    <div style={{marginTop: '1rem'}}>
                        <button onClick={() => toggleTeamNamesVisibility(division.id)} style={{backgroundColor: '#6c757d'}}>
                            {visibleTeamNames[division.id] ? 'Hide Team Names' : 'Edit Team Names (Optional)'}
                        </button>
                        {visibleTeamNames[division.id] && (
                            <div style={{marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem'}}>
                                {Array.from({ length: division.numTeams }).map((_, teamIndex) => (
                                    <div key={teamIndex} className="form-group">
                                        <label>Team {teamIndex + 1} Name</label>
                                        <input
                                            type="text"
                                            // --- UPDATED Placeholder ---
                                            placeholder={`${division.name || 'Division'} - Team ${teamIndex + 1}`}
                                            value={division.teamNames[teamIndex] || ''}
                                            onChange={(e) => handleTeamNameChange(division.id, teamIndex, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <div style={{marginTop: '2rem'}}>
                <button onClick={handleAddDivision} style={{ marginRight: '1rem' }}>
                    + Add Division
                </button>
                <button onClick={handleGenerateSchedule}>
                    Generate Schedule
                </button>
            </div>
        </div>
    );
};

export default DivisionsSetup;