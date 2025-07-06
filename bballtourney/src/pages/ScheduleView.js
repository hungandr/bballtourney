// src/pages/ScheduleView.js
import React, { useMemo, useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import './ScheduleView.css';

function createAllPossibleTimeSlots(settings) {
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
    const { state } = useTournament();
    const { schedule, settings } = state;
    const [viewMode, setViewMode] = useState('division');

    // --- Data Grouping Logic ---
    const gamesByDivision = useMemo(() => {
        if (!schedule?.games) return {};
        const grouped = schedule.games.reduce((acc, game) => {
            const key = game.divisionName;
            if (!acc[key]) acc[key] = [];
            acc[key].push(game);
            return acc;
        }, {});
        for (const key in grouped) {
            grouped[key].sort((a, b) => (a.absTime || 0) - (b.absTime || 0) || a.court - b.court);
        }
        return grouped;
    }, [schedule]);

    const gamesByCourt = useMemo(() => {
        if (!schedule?.games) return {};
        const scheduledGamesMap = new Map();
        schedule.games.forEach(game => {
            const key = `D${game.day}-T${game.time}-C${game.court}`;
            scheduledGamesMap.set(key, game);
        });
        const allPossibleSlots = createAllPossibleTimeSlots(settings);
        const masterCourtTimeline = allPossibleSlots.reduce((acc, slot) => {
            const courtKey = `Court ${slot.court}`;
            if (!acc[courtKey]) acc[courtKey] = [];
            const slotKey = `D${slot.day}-T${slot.time}-C${slot.court}`;
            const scheduledGame = scheduledGamesMap.get(slotKey);
            if (scheduledGame) { acc[courtKey].push(scheduledGame); }
            else { acc[courtKey].push({ id: `empty-${slotKey}`, ...slot, isEmpty: true }); }
            return acc;
        }, {});
        return masterCourtTimeline;
    }, [schedule, settings]);

    const gamesByDay = useMemo(() => {
        if (!schedule?.games) return {};
        const grouped = schedule.games.reduce((acc, game) => {
            const key = `Day ${game.day}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(game);
            return acc;
        }, {});
        for (const key in grouped) {
            grouped[key].sort((a, b) => (a.absTime || 0) - (b.absTime || 0) || a.court - b.court);
        }
        return grouped;
    }, [schedule]);

    // --- Render Logic ---
    if (!schedule) { return (<div className="page-card"><h2>Schedule</h2><p>Not generated yet.</p></div>); }
    if (schedule.error) { return ( <div className="page-card error-card"><h2>Scheduling Error</h2><p>{schedule.error}</p></div> ); }
    if (schedule.games.length === 0) { return ( <div className="page-card"><h2>Schedule</h2><p>No games were generated.</p></div> ); }

    return (
        <div className="page-card">
            <div className="view-header">
                <h2>Generated Schedule</h2>
                <div className="view-switcher">
                    <button onClick={() => setViewMode('division')} className={viewMode === 'division' ? 'active' : ''}>By Division</button>
                    <button onClick={() => setViewMode('court')} className={viewMode === 'court' ? 'active' : ''}>By Court</button>
                    <button onClick={() => setViewMode('day')} className={viewMode === 'day' ? 'active' : ''}>By Day</button>
                </div>
            </div>

            {viewMode === 'division' && (Object.keys(gamesByDivision).sort().map(divisionName => (
                <div key={divisionName} className="schedule-grouping-block">
                    <h3>{divisionName}</h3>
                    <table className="schedule-table">
                        <thead><tr><th>Day</th><th>Time</th><th>Court</th><th>Phase</th><th>Matchup</th></tr></thead>
                        <tbody>{gamesByDivision[divisionName].map(game => (
                            <tr key={game.id}>
                                <td>{game.day}</td><td>{game.time}</td><td>{game.court}</td>
                                <td>{game.gamePhase}</td>
                                <td>{game.team1} vs {game.team2}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )))}

            {viewMode === 'court' && (Object.keys(gamesByCourt).sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1])).map(courtName => (
                <div key={courtName} className="schedule-grouping-block">
                    <h3>{courtName}</h3>
                    <table className="schedule-table">
                        <thead><tr><th>Day</th><th>Time</th><th>Division</th><th>Phase</th><th>Matchup</th></tr></thead>
                        <tbody>
                        {gamesByCourt[courtName].map(gameOrSlot =>
                            gameOrSlot.isEmpty ? (
                                <tr key={gameOrSlot.id} className="empty-slot"><td>{gameOrSlot.day}</td><td>{gameOrSlot.time}</td><td colSpan="3" className="empty-slot-text">--- Open Slot ---</td></tr>
                            ) : (
                                <tr key={gameOrSlot.id}><td>{gameOrSlot.day}</td><td>{gameOrSlot.time}</td><td>{gameOrSlot.divisionName}</td><td>{gameOrSlot.gamePhase}</td><td>{gameOrSlot.team1} vs {gameOrSlot.team2}</td></tr>
                            )
                        )}
                        </tbody>
                    </table>
                </div>
            )))}

            {viewMode === 'day' && (Object.keys(gamesByDay).sort().map(dayName => (
                <div key={dayName} className="schedule-grouping-block">
                    <h3>{dayName}</h3>
                    <table className="schedule-table">
                        <thead><tr><th>Time</th><th>Court</th><th>Division</th><th>Phase</th><th>Matchup</th></tr></thead>
                        <tbody>{gamesByDay[dayName].map(game => (
                            <tr key={game.id}><td>{game.time}</td><td>{game.court}</td><td>{game.divisionName}</td><td>{game.gamePhase}</td><td>{game.team1} vs {game.team2}</td></tr>
                        ))}</tbody>
                    </table>
                </div>
            )))}
        </div>
    );
};

export default ScheduleView;