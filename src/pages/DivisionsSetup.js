import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { generateFullSchedule } from '../utils/scheduleGenerator';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const DivisionsSetup = () => {
    const { state, dispatch } = useTournament();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDivisions = async () => {
            try {
                const response = await fetch(`${API_URL}/api/divisions/setup`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.divisions && data.divisions.length > 0) {
                        dispatch({ type: 'SET_FULL_STATE', payload: { settings: state.settings, ...data } });
                    }
                }
            } catch (error) { console.error("Could not load saved division setup:", error); }
            finally { setIsLoading(false); }
        };
        loadDivisions();
    }, [dispatch, state.settings]);

    const poolPlayDivisions = state.divisions.filter(d => d.divisionType === 'Pool Play');

    const handleAddDivision = (type) => dispatch({ type: 'ADD_DIVISION', payload: { type } });
    const handleRemoveDivision = (id) => dispatch({ type: 'REMOVE_DIVISION', payload: { id } });
    const handleDivisionChange = (id, field, value) => {
        const data = field === 'numTeams' ? { [field]: parseInt(value) || 0 } : { [field]: value };
        dispatch({ type: 'UPDATE_DIVISION', payload: { id, data } });
    };

    const handleTeamNameChange = (divisionId, teamId, name) => {
        dispatch({ type: 'UPDATE_TEAM', payload: { divisionId, teamId, data: { name } } });
    };

    const handleAvailabilityChange = (divisionId, teamId, day, period, isChecked) => {
        const team = state.divisions.find(d => d.id === divisionId)?.teams.find(t => t.id === teamId);
        if (!team) return;
        const newAvailability = { ...team.availability, [day]: { ...(team.availability[day] || {}), [period]: isChecked } };
        dispatch({ type: 'UPDATE_TEAM', payload: { divisionId, teamId, data: { availability: newAvailability } } });
    };

    const handleDependencyChange = (divisionId, dependencyId, isChecked) => {
        const division = state.divisions.find(d => d.id === divisionId);
        if (!division) return;
        const currentDeps = division.poolPlayDependencies || [];
        const newDeps = isChecked ? [...currentDeps, dependencyId] : currentDeps.filter(id => id !== dependencyId);
        dispatch({ type: 'UPDATE_DIVISION', payload: { id: divisionId, data: { poolPlayDependencies: newDeps } } });
    };

    const saveDivisionSetup = async () => {
        try {
            await fetch(`${API_URL}/api/divisions/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ divisions: state.divisions }),
            });
        } catch (error) { console.error("Could not save division setup:", error); }
    };

    const handleGenerateAndSaveSchedule = async () => {
        setIsSaving(true);
        const stateWithDefaults = { ...state };
        stateWithDefaults.divisions = state.divisions.map((div, divIndex) => {
            return {
                ...div,
                teams: (div.teams || []).map((team, teamIndex) => {
                    if (team.name.trim() === '') {
                        const divName = div.name.trim() || `Division #${divIndex + 1}`;
                        const teamOrSlot = div.divisionType === 'Pool Play' ? 'Team' : 'Slot';
                        const defaultName = `${divName} ${teamOrSlot} ${teamIndex + 1}`;
                        return { ...team, name: defaultName };
                    }
                    return team;
                }),
            };
        });

        const newSchedule = generateFullSchedule(stateWithDefaults);
        if (newSchedule.error) {
            alert(`Scheduling Failed: ${newSchedule.error}`);
            setIsSaving(false);
            return;
        }

        const payload = { ...stateWithDefaults, schedule: newSchedule };
        delete payload._id;

        try {
            const response = await fetch(`${API_URL}/api/tournaments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save schedule to server.');
            }
            const savedTournament = await response.json();
            await saveDivisionSetup();
            dispatch({ type: 'SET_FULL_STATE', payload: savedTournament });
            navigate(`/schedule/${savedTournament._id}`);
        } catch (error) {
            console.error('Save error:', error);
            alert(`Could not save the schedule. ${error.message}`);
        } finally { setIsSaving(false); }
    };

    if (isLoading) return <div className="page-card"><h2>Loading Division Setup...</h2></div>;

    return (
        <div className="page-card page-card--wide division-setup-page"> {/* <-- NEW CLASS ADDED HERE */}
            <h2>2. Divisions Setup</h2>
            {state.divisions.map((division, index) => (
                <div key={division.id} className="page-card" style={{ border: '1px solid #ddd', marginTop: '1rem', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4>Division #{index + 1}: {division.name || 'Untitled'} ({division.divisionType})</h4>
                        <button className="button-secondary" onClick={() => handleRemoveDivision(division.id)} disabled={isSaving}>Remove Division</button>
                    </div>
                    <div className="form-grid-2-col">
                        <div className="form-group"><label htmlFor={`name-${division.id}`}>Division Name</label><input type="text" id={`name-${division.id}`} value={division.name} onChange={(e) => handleDivisionChange(division.id, 'name', e.target.value)} disabled={isSaving}/></div>
                        <div className="form-group"><label htmlFor={`numTeams-${division.id}`}>Number of Teams</label><input type="number" id={`numTeams-${division.id}`} min="2" value={division.numTeams} onChange={(e) => handleDivisionChange(division.id, 'numTeams', e.target.value)} disabled={isSaving}/></div>
                    </div>

                    {(division.divisionType === 'Championship' || division.divisionType === 'Consolation') && (
                        <div className="form-group">
                            <label>Depends on Teams From (Pool Play)</label>
                            <div className="dependency-grid">
                                {poolPlayDivisions.length === 0 ? (
                                    <p style={{ margin: 0, fontStyle: 'italic', color: '#666' }}>No Pool Play divisions available to select.</p>
                                ) : (
                                    poolPlayDivisions.map(poolDiv => (
                                        <label key={poolDiv.id}>
                                            <input
                                                type="checkbox"
                                                checked={(division.poolPlayDependencies || []).includes(poolDiv.id.toString())}
                                                onChange={(e) => handleDependencyChange(division.id, poolDiv.id.toString(), e.target.checked)}
                                                disabled={isSaving}
                                            />
                                            {poolDiv.name || `Pool Division #${state.divisions.indexOf(poolDiv) + 1}`}
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
                        <h4 style={{marginTop: 0, marginBottom: '1rem'}}>Teams & Availability</h4>
                        {(division.teams || []).map((team, teamIndex) => {
                            const divisionDisplayName = division.name.trim() || `Division #${index + 1}`;
                            const teamOrSlot = division.divisionType === 'Pool Play' ? 'Team' : 'Slot';
                            const defaultTeamName = `${divisionDisplayName} ${teamOrSlot} ${teamIndex + 1}`;
                            const displayValue = team.name || defaultTeamName;

                            return (
                                <div key={team.id} style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                                    <div className="team-setup-row">
                                        <div className="form-group">
                                            <label htmlFor={`teamName-${team.id}`}>{`${teamOrSlot} #${teamIndex + 1} Name`}</label>
                                            <input
                                                type="text"
                                                id={`teamName-${team.id}`}
                                                value={displayValue}
                                                onFocus={(e) => { if (team.name.trim() === '') e.target.select() }}
                                                onChange={(e) => handleTeamNameChange(division.id, team.id, e.target.value)}
                                                disabled={isSaving}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Daily Availability</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {Array.from({ length: state.settings.days }, (_, i) => i + 1).map(day => (
                                                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                        <strong style={{ minWidth: '60px' }}>Day {day}:</strong>
                                                        <label style={{ fontWeight: 'normal', cursor: 'pointer' }}><input type="checkbox" checked={team.availability?.[day]?.morning ?? true} onChange={(e) => handleAvailabilityChange(division.id, team.id, day, 'morning', e.target.checked)} disabled={isSaving}/> Morning</label>
                                                        <label style={{ fontWeight: 'normal', cursor: 'pointer' }}><input type="checkbox" checked={team.availability?.[day]?.afternoon ?? true} onChange={(e) => handleAvailabilityChange(division.id, team.id, day, 'afternoon', e.target.checked)} disabled={isSaving}/> Afternoon</label>
                                                        <label style={{ fontWeight: 'normal', cursor: 'pointer' }}><input type="checkbox" checked={team.availability?.[day]?.evening ?? true} onChange={(e) => handleAvailabilityChange(division.id, team.id, day, 'evening', e.target.checked)} disabled={isSaving}/> Evening</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            <div style={{marginTop: '2rem'}}>
                <button onClick={() => handleAddDivision('Pool Play')} style={{ marginRight: '1rem' }} disabled={isSaving}>+ Add Pool Play</button>
                <button onClick={() => handleAddDivision('Championship')} style={{ marginRight: '1rem' }} className="button-secondary" disabled={isSaving}>+ Add Championship</button>
                <button onClick={() => handleAddDivision('Consolation')} style={{ marginRight: '1rem' }} className="button-secondary" disabled={isSaving}>+ Add Consolation</button>
            </div>
            <div style={{marginTop: '2rem', borderTop: '2px solid #1976d2', paddingTop: '2rem'}}>
                <button onClick={handleGenerateAndSaveSchedule} disabled={isSaving}>{isSaving ? 'Generating & Saving...' : 'Generate & Save Schedule'}</button>
            </div>
        </div>
    );
};

export default DivisionsSetup;