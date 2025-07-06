// src/pages/ScheduleView.js
import React, { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import './ScheduleView.css';

const ScheduleView = () => {
    const { state } = useTournament();
    const { schedule } = state;

    // Group games by Day, then by Phase for a much clearer view
    const gamesByDayAndPhase = useMemo(() => {
        if (!schedule?.games) return {};

        return schedule.games.reduce((acc, game) => {
            const dayKey = `Day ${game.day}`;
            const phaseKey = game.gamePhase;

            if (!acc[dayKey]) acc[dayKey] = {};
            if (!acc[dayKey][phaseKey]) acc[dayKey][phaseKey] = [];

            acc[dayKey][phaseKey].push(game);

            // Sort games within each phase by time, then court
            acc[dayKey][phaseKey].sort((a, b) => {
                if (a.time < b.time) return -1;
                if (a.time > b.time) return 1;
                if (a.court < b.court) return -1;
                if (a.court > b.court) return 1;
                return 0;
            });

            return acc;
        }, {});
    }, [schedule]);

    if (!schedule) {
        return (
            <div className="page-card">
                <h2>Schedule</h2>
                <p>The schedule has not been generated yet. Complete the setup and click "Generate Schedule".</p>
            </div>
        );
    }

    if (schedule.error) {
        return (
            <div className="page-card error-card">
                <h2>Scheduling Error</h2>
                <p>{schedule.error}</p>
            </div>
        );
    }

    if (schedule.games.length === 0) {
        return (
            <div className="page-card">
                <h2>Schedule</h2>
                <p>No games were generated. Check your division and team settings.</p>
            </div>
        );
    }

    return (
        <div className="page-card">
            <h2>Generated Schedule</h2>
            {Object.keys(gamesByDayAndPhase).sort().map(day => (
                <div key={day} className="day-schedule">
                    <h3>{day}</h3>
                    {Object.keys(gamesByDayAndPhase[day]).sort().map(phase => (
                        <div key={phase} className="phase-block">
                            <h4>{phase}</h4>
                            <table className="schedule-table">
                                <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Court</th>
                                    <th>Division</th>
                                    <th>Pool / Stage</th>
                                    <th>Matchup</th>
                                </tr>
                                </thead>
                                <tbody>
                                {gamesByDayAndPhase[day][phase].map(game => (
                                    <tr key={game.id}>
                                        <td>{game.time}</td>
                                        <td>{game.court}</td>
                                        <td>{game.divisionName}</td>
                                        <td>{game.subDivisionName}</td>
                                        <td>{game.team1} vs {game.team2}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default ScheduleView;