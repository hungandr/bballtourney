import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import './ScheduleView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const ScheduleView = () => {
    const { state, dispatch } = useTournament();
    const { schedule, settings } = state;
    const { id: scheduleId } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('division');
    const [fetchError, setFetchError] = useState(null);

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
                dispatch({ type: 'SET_FULL_STATE', payload: data });
            } catch (err) {
                console.error("Fetch error:", err);
                setFetchError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (scheduleId) {
            if (!state.schedule || state._id !== scheduleId) {
                fetchTournament(scheduleId);
            }
        }
    }, [scheduleId, dispatch, state._id, state.schedule]);

    const handleStartOver = () => {
        // The localStorage line has been removed.
        dispatch({ type: 'RESET_STATE' });
        navigate('/');
    };

    const formatTime12Hour = (timeString) => {
        if (!timeString) return '';
        const [hourString, minute] = timeString.split(':');
        let hour = parseInt(hourString, 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minute} ${period}`;
    };

    const gamesByDivision = useMemo(() => {
        if (!schedule?.games) return {};
        return schedule.games.reduce((acc, game) => {
            const key = game.divisionName || 'Unassigned';
            if (!acc[key]) acc[key] = [];
            acc[key].push(game);
            return acc;
        }, {});
    }, [schedule]);

    const gamesByCourt = useMemo(() => {
        if (!schedule?.games || !settings || !Array.isArray(settings.dayTimes)) {
            return {};
        }

        const timeToMinutes = (timeStr) => parseInt(timeStr.split(':')[0]) * 60 + parseInt(timeStr.split(':')[1]);
        const allSlots = [];
        settings.dayTimes.forEach((daySetting, dayIndex) => {
            const day = dayIndex + 1;
            const start = timeToMinutes(daySetting.startTime);
            const end = timeToMinutes(daySetting.endTime);
            for (let court = 1; court <= settings.courts; court++) {
                for (let time = start; time <= end; time += settings.gameDuration) {
                    const hours = Math.floor(time / 60).toString().padStart(2, '0');
                    const minutes = (time % 60).toString().padStart(2, '0');
                    allSlots.push({ day, court, time: `${hours}:${minutes}`, key: `${day}-${court}-${hours}:${minutes}` });
                }
            }
        });

        const gameMap = new Map(schedule.games.map(g => [`${g.day}-${g.court}-${g.time}`, g]));

        const grouped = allSlots.reduce((acc, slot) => {
            const key = `Court ${slot.court}`;
            if (!acc[key]) acc[key] = [];
            const game = gameMap.get(slot.key);
            if (game) {
                acc[key].push(game);
            } else {
                acc[key].push({ ...slot, type: 'empty' });
            }
            return acc;
        }, {});

        return grouped;
    }, [schedule, settings]);

    const gamesByDay = useMemo(() => {
        if (!schedule?.games) return {};
        return schedule.games.reduce((acc, game) => {
            const key = `Day ${game.day}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(game);
            return acc;
        }, {});
    }, [schedule]);

    const gamesByTeam = useMemo(() => {
        if (!schedule?.games) return {};
        const allTeams = new Set();
        schedule.games.forEach(g => {
            allTeams.add(g.team1);
            allTeams.add(g.team2);
        });

        const grouped = {};
        allTeams.forEach(team => {
            grouped[team] = schedule.games.filter(g => g.team1 === team || g.team2 === team);
        });
        return grouped;
    }, [schedule]);

    const renderGamesTable = (games) => (
        <table className="schedule-table">
            <thead>
            <tr>
                <th>Day</th>
                <th>Time</th>
                <th>Court</th>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Division</th>
            </tr>
            </thead>
            <tbody>
            {games.map((game, index) => (
                game.type === 'empty' ? (
                    <tr key={`${game.key}-${index}`} className="empty-slot">
                        <td data-label="Day">{game.day}</td>
                        <td data-label="Time">{formatTime12Hour(game.time)}</td>
                        <td data-label="Court">{`Court ${game.court}`}</td>
                        <td colSpan="3" className="empty-slot-text">-- Available --</td>
                    </tr>
                ) : (
                    <tr key={game.id || index}>
                        <td data-label="Day">{game.day}</td>
                        <td data-label="Time">{formatTime12Hour(game.time)}</td>
                        <td data-label="Court">{`Court ${game.court}`}</td>
                        <td data-label="Team 1">{game.team1}</td>
                        <td data-label="Team 2">{game.team2}</td>
                        <td data-label="Division">{game.divisionName}</td>
                    </tr>
                )
            ))}
            </tbody>
        </table>
    );

    if (isLoading) return <div className="page-card"><h2>Loading Schedule...</h2></div>;

    if (fetchError) return (
        <div className="page-card error-card">
            <h2>Error Loading Schedule</h2>
            <p>{fetchError}</p>
            <button onClick={handleStartOver}>Start Over</button>
        </div>
    );

    if (!schedule) return (
        <div className="page-card">
            <h2>Schedule Not Found</h2>
            <p>A schedule has not been generated or loaded.</p>
            <button onClick={handleStartOver}>Start Over</button>
        </div>
    );

    if (schedule.error) return (
        <div className="page-card error-card">
            <h2>Scheduling Error</h2>
            <p>{schedule.error}</p>
            <button onClick={() => navigate('/divisions')}>Go Back to Divisions</button>
        </div>
    );

    if (schedule.games.length === 0) return (
        <div className="page-card">
            <h2>Schedule</h2>
            <p>No games were generated. This might be because there are not enough teams or time slots.</p>
            <button onClick={() => navigate('/divisions')}>Go Back to Divisions</button>
        </div>
    );

    return (
        <div className="page-card">
            <div className="view-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <h2>Tournament Schedule</h2>
                    <button onClick={handleStartOver} className="button-secondary">New Tournament</button>
                </div>
                <div className="view-switcher">
                    <button onClick={() => setViewMode('division')} className={viewMode === 'division' ? 'active' : ''}>By Division</button>
                    <button onClick={() => setViewMode('court')} className={viewMode === 'court' ? 'active' : ''}>By Court</button>
                    <button onClick={() => setViewMode('day')} className={viewMode === 'day' ? 'active' : ''}>By Day</button>
                    <button onClick={() => setViewMode('team')} className={viewMode === 'team' ? 'active' : ''}>By Team</button>
                </div>
            </div>

            {viewMode === 'division' && Object.entries(gamesByDivision).map(([divisionName, games]) => (
                <div key={divisionName} className="schedule-grouping-block">
                    <h3>{divisionName}</h3>
                    {renderGamesTable(games)}
                </div>
            ))}

            {viewMode === 'court' && Object.entries(gamesByCourt).map(([courtName, games]) => (
                <div key={courtName} className="schedule-grouping-block">
                    <h3>{courtName}</h3>
                    {renderGamesTable(games)}
                </div>
            ))}

            {viewMode === 'day' && Object.entries(gamesByDay).map(([dayName, games]) => (
                <div key={dayName} className="schedule-grouping-block">
                    <h3>{dayName}</h3>
                    {renderGamesTable(games)}
                </div>
            ))}

            {viewMode === 'team' && Object.entries(gamesByTeam).map(([teamName, games]) => (
                <div key={teamName} className="schedule-grouping-block">
                    <h3>{teamName}</h3>
                    {renderGamesTable(games)}
                </div>
            ))}
        </div>
    );
};

export default ScheduleView;