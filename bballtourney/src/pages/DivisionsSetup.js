// src/pages/DivisionsSetup.js
import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

const DivisionsSetup = () => {
    const { state, dispatch } = useTournament();
    const navigate = useNavigate();

    // --- THIS IS THE CORRECT PLACEMENT ---
    // The useEffect hook must be inside the component function.
    // This will clear any old schedule data when the user returns to this page.
    useEffect(() => {
        dispatch({ type: 'CLEAR_SCHEDULE' });
    }, [dispatch]);
    // ------------------------------------

    // --- Division Handlers ---
    const handleAddDivision = () => dispatch({ type: 'ADD_DIVISION' });
    const handleRemoveDivision = (id) => dispatch({ type: 'REMOVE_DIVISION', payload: { id } });
    const handleDivisionChange = (id, field, value) => {
        dispatch({
            type: 'UPDATE_DIVISION',
            payload: { id, data: { [field]: value } },
        });
    };

    // --- Sub-Division Handlers ---
    const handleAddSubDivision = (divisionId) => dispatch({ type: 'ADD_SUB_DIVISION', payload: { divisionId } });
    const handleRemoveSubDivision = (divisionId, subDivisionId) => dispatch({ type: 'REMOVE_SUB_DIVISION', payload: { divisionId, subDivisionId } });
    const handleSubDivisionChange = (divisionId, subDivisionId, field, value) => {
        const data = field === 'numTeams' ? { [field]: parseInt(value) || 0 } : { [field]: value };
        dispatch({
            type: 'UPDATE_SUB_DIVISION',
            payload: { divisionId, subDivisionId, data },
        });
    };

    // --- Validation Logic ---
    const validationError = useMemo(() => {
        for (const division of state.divisions) {
            if (division.type === 'sub-division-round-robin') {
                if (division.subDivisions.length < 2) {
                    return `Division "${division.name || 'Untitled'}" needs at least 2 pools for a playoff.`;
                }
                for (const subDiv of division.subDivisions) {
                    if (subDiv.numTeams < 4) {
                        return `In Division "${division.name || 'Untitled'}", the pool "${subDiv.name}" must have at least 4 teams to guarantee 3 games.`;
                    }
                }
            }
        }
        return null; // No errors
    }, [state.divisions]);

    // --- Schedule Generation ---
    const handleGenerateSchedule = () => {
        if (validationError) {
            alert(`Please fix the errors before generating a schedule:\n${validationError}`);
            return;
        }
        dispatch({ type: 'GENERATE_SCHEDULE' });
        navigate('/schedule');
    };

    return (
        <div className="page-card">
            <h2>2. Divisions & Sub-Divisions Setup</h2>
            {state.divisions.map((division) => (
                <div key={division.id} className="page-card" style={{ border: '1px solid #ddd', marginTop: '1rem' }}>
                    {/* Division Level Settings */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>Division: {division.name || 'Untitled'}</h4>
                        <button className="button-secondary" onClick={() => handleRemoveDivision(division.id)}>
                            Remove Division
                        </button>
                    </div>
                    <div className="form-group">
                        <label htmlFor={`name-${division.id}`}>Division Name</label>
                        <input
                            type="text"
                            id={`name-${division.id}`}
                            placeholder="e.g., U12 Boys"
                            value={division.name}
                            onChange={(e) => handleDivisionChange(division.id, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor={`type-${division.id}`}>Tournament Type</label>
                        <select
                            id={`type-${division.id}`}
                            value={division.type}
                            onChange={(e) => handleDivisionChange(division.id, 'type', e.target.value)}
                        >
                            <option value="round-robin">Round Robin (within pools)</option>
                            <option value="single-elimination">Single Elimination</option>
                            <option value="sub-division-round-robin">Pool Play + Playoffs (3-Game Guarantee)</option>
                        </select>
                    </div>

                    {/* Sub-Division Level Settings */}
                    <h5 style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>Sub-Divisions / Pools</h5>
                    {division.subDivisions.map((subDiv) => (
                        <div key={subDiv.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <div className="form-group" style={{ flex: '2 1 0%', marginBottom: 0 }}>
                                <label htmlFor={`sub-div-name-${subDiv.id}`}>Name</label>
                                <input
                                    id={`sub-div-name-${subDiv.id}`}
                                    type="text"
                                    placeholder="e.g., Pool A"
                                    value={subDiv.name}
                                    onChange={(e) => handleSubDivisionChange(division.id, subDiv.id, 'name', e.target.value)}
                                />
                            </div>
                            <div className="form-group" style={{ flex: '1 1 0%', marginBottom: 0 }}>
                                <label htmlFor={`sub-div-teams-${subDiv.id}`}>Teams</label>
                                <input
                                    id={`sub-div-teams-${subDiv.id}`}
                                    type="number"
                                    min="2"
                                    value={subDiv.numTeams}
                                    onChange={(e) => handleSubDivisionChange(division.id, subDiv.id, 'numTeams', e.target.value)}
                                />
                            </div>
                            <button
                                className="button-secondary"
                                style={{ alignSelf: 'flex-end', marginBottom: '0px', padding: '10px' }}
                                onClick={() => handleRemoveSubDivision(division.id, subDiv.id)}>
                                X
                            </button>
                        </div>
                    ))}
                    <button onClick={() => handleAddSubDivision(division.id)}>+ Add Sub-Division / Pool</button>
                </div>
            ))}
            <button onClick={handleAddDivision} style={{ marginRight: '1rem', marginTop: '1rem' }}>
                + Add Division
            </button>

            {/* Display Validation Error and Disable Button */}
            {validationError && (
                <div style={{ color: '#d32f2f', background: '#ffcdd2', padding: '10px', borderRadius: '4px', marginTop: '1rem' }}>
                    <strong>Error:</strong> {validationError}
                </div>
            )}
            <button onClick={handleGenerateSchedule} disabled={!!validationError} style={{ marginTop: '1rem' }}>
                Generate Schedule
            </button>
        </div>
    );
};

export default DivisionsSetup;