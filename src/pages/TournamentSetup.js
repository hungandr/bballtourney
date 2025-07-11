import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

const TournamentSetup = () => {
    const { state, dispatch } = useTournament();
    const navigate = useNavigate();

    useEffect(() => { dispatch({ type: 'CLEAR_SCHEDULE' }); }, [dispatch]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const parsedValue = e.target.type === 'number' ? parseInt(value) || 0 : value;
        dispatch({ type: 'UPDATE_SETTINGS', payload: { [name]: parsedValue } });
    };

    const handleDayTimeChange = (index, field, value) => {
        const newDayTimes = [...state.settings.dayTimes];
        newDayTimes[index] = { ...newDayTimes[index], [field]: value };
        dispatch({ type: 'UPDATE_SETTINGS', payload: { dayTimes: newDayTimes } });
    };

    const goToNextStep = () => { navigate('/divisions'); };

    return (
        <div className="page-card">
            <h2>1. Tournament Parameters</h2>

            <div className="form-group"><label htmlFor="courts">Number of Courts</label><input type="number" id="courts" name="courts" value={state.settings.courts} onChange={handleInputChange} min="1"/></div>
            <div className="form-group"><label htmlFor="days">Number of Days</label><input type="number" id="days" name="days" value={state.settings.days} onChange={handleInputChange} min="1"/></div>
            <div className="form-group"><label htmlFor="gameDuration">Time per Game (minutes)</label><input type="number" id="gameDuration" name="gameDuration" value={state.settings.gameDuration} onChange={handleInputChange} step="5" min="10"/></div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <h4>Daily Start & End Times</h4>
                {state.settings.dayTimes && state.settings.dayTimes.map((dayTime, index) => (
                    <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <strong style={{ minWidth: '60px' }}>Day {index + 1}</strong>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label htmlFor={`startTime-${index}`}>Start Time</label>
                            <input type="time" id={`startTime-${index}`} value={dayTime.startTime} onChange={(e) => handleDayTimeChange(index, 'startTime', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label htmlFor={`endTime-${index}`}>End Time (Last Game Start)</label>
                            <input type="time" id={`endTime-${index}`} value={dayTime.endTime} onChange={(e) => handleDayTimeChange(index, 'endTime', e.target.value)} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="form-group"><label htmlFor="minBreak">Minimum Break Between Games (minutes)</label><input type="number" id="minBreak" name="minBreak" value={state.settings.minBreak} onChange={handleInputChange} step="15" min="0"/></div>

            {/* --- THIS INPUT FIELD HAS BEEN RE-ADDED --- */}
            <div className="form-group"><label htmlFor="maxBreak">Maximum Break Between Games (minutes)</label><input type="number" id="maxBreak" name="maxBreak" value={state.settings.maxBreak} onChange={handleInputChange} step="15" min="0"/></div>

            <button onClick={goToNextStep}>Next: Set Up Divisions →</button>
        </div>
    );
};

export default TournamentSetup;