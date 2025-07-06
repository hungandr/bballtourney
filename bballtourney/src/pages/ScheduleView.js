// src/pages/ScheduleView.js
import React, { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import './ScheduleView.css'; // We'll create this file next

const ScheduleView = () => {
    const { state } = useTournament();
    const { schedule } = state;

    // Group games by day using useMemo for performance
    const gamesByDay = useMemo(() => {
        if (!schedule?.games) return {};
        return schedule.games.reduce((acc, game) => {
            const day = `Day ${game.day}`;
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(game);
            // Sort games within the day by time, then court
            acc[day].sort((a, b) => {
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
                <p>The schedule has not been generated yet. Complete the setup and click "Generate Schedule" on the Divisions page.</p>
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
            {Object.keys(gamesByDay).map(day => (
                <div key={day} className="day-schedule">
                    <h3>{day}</h3>
                    <table className="schedule-table">
                        <thead>
                        <tr>
                            <th>Time</th>
                            <th>Court</th>
                            <th>Division</th>
                            <th>Stage</th>
                            <th>Matchup</th>
                        </tr>
                        </thead>
                        <tbody>
                        {gamesByDay[day].map(game => (
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
    );
};

export default ScheduleView;