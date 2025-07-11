import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import './ScheduleView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// --- HELPER COMPONENT ---
const ScheduleDetail = ({
                            scheduleId, isLoading, fetchError, schedule, settings, handleStartOver, navigate,
                            viewMode, setViewMode, filterText, setFilterText,
                            masterScheduleGrid, filteredDetailedData, renderGamesTable, formatTime12Hour
                        }) => {

    if (!scheduleId) return <div className="page-card page-card--wide"><h2>Loading latest schedule...</h2></div>;
    if (isLoading) return <div className="page-card page-card--wide"><h2>Loading Schedule...</h2></div>;
    if (fetchError) return (<div className="page-card page-card--wide error-card"><h2>Error Loading Schedule</h2><p>{fetchError}</p></div>);
    if (!schedule) return <div className="page-card page-card--wide"><h2>Schedule not found.</h2></div>;
    if (schedule.error) return (<div className="page-card page-card--wide error-card"><h2>Scheduling Error</h2><p>{schedule.error}</p><button onClick={() => navigate('/divisions')}>Go Back</button></div>);
    if (schedule.games.length === 0) return (<div className="page-card page-card--wide"><h2>Schedule</h2><p>No games were generated for this schedule.</p></div>);

    return (
        <div className="page-card page-card--wide">
            <div className="view-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}><h2 style={{whiteSpace: 'nowrap'}}>Tournament Schedule</h2><button onClick={handleStartOver} className="button-secondary">New</button></div>
            </div>

            {settings && (
                <div className="schedule-summary-box">
                    <div><p><strong>Courts:</strong> {settings.courts}</p><p><strong>Days:</strong> {settings.days}</p></div>
                    <div>
                        <p><strong>Game Duration:</strong> {settings.gameDuration} mins</p>
                        <p><strong>Min. Break:</strong> {settings.minBreak} mins</p>
                        {/* --- THIS LINE IS NEW --- */}
                        {settings.maxBreak !== undefined && <p><strong>Max. Break:</strong> {settings.maxBreak} mins</p>}
                    </div>
                    <div><strong>Daily Times:</strong>{settings.dayTimes?.map(dt => (<p key={dt.day}>Day {dt.day}: {formatTime12Hour(dt.startTime)} - {formatTime12Hour(dt.endTime)}</p>))}</div>
                </div>
            )}

            {masterScheduleGrid && Object.keys(masterScheduleGrid).length > 0 && Object.entries(masterScheduleGrid).map(([day, dayData]) => ( <div key={day} className="master-schedule-block"> <h3>{day} - Master Grid</h3> <div className="master-schedule-wrapper"><table className="master-schedule-table"><thead><tr><th className="time-header-cell">Time</th>{dayData.courts.map(court => <th key={court}>Court {court}</th>)}</tr></thead><tbody>{dayData.times.map(time => (<tr key={time}><td className="time-header-cell">{formatTime12Hour(time)}</td>{dayData.courts.map(court => { const game = dayData.grid[time][court]; return (<td key={court} className={game ? 'game-cell' : 'empty-cell'}>{game ? (<div><span className="game-cell-teams">{game.team1} vs {game.team2}</span><span className="game-cell-division">{game.divisionName}</span></div>) : null}</td>);})}</tr>))}</tbody></table></div> </div> ))}

            <div className="view-header" style={{marginTop: '3rem', borderTop: '2px solid #eee', paddingTop: '2rem'}}>
                <h3>Detailed Views</h3>
                <div className="filter-input-wrapper"><input type="text" className="filter-input" placeholder="Filter by team or division..." value={filterText} onChange={(e) => setFilterText(e.target.value)} /></div>
                <div className="view-switcher"><button onClick={() => setViewMode('division')} className={viewMode === 'division' ? 'active' : ''}>By Division</button><button onClick={() => setViewMode('court')} className={viewMode === 'court' ? 'active' : ''}>By Court</button><button onClick={() => setViewMode('day')} className={viewMode === 'day' ? 'active' : ''}>By Day</button><button onClick={() => setViewMode('team')} className={viewMode === 'team' ? 'active' : ''}>By Team</button></div>
            </div>

            {filteredDetailedData && Object.keys(filteredDetailedData).length > 0 && Object.entries(filteredDetailedData).map(([groupName, games]) => ( <div key={groupName} className="schedule-grouping-block"><h3>{groupName}</h3>{renderGamesTable(games)}</div> ))}

            {filteredDetailedData && Object.keys(filteredDetailedData).length === 0 && filterText && (<div className="no-results-card"><p>No games match your filter: "{filterText}"</p></div>)}
        </div>
    );
};


// --- MAIN COMPONENT ---
const ScheduleView = () => {
    const { state, dispatch } = useTournament();
    const { schedule, settings } = state;
    const { id: scheduleId } = useParams();
    const navigate = useNavigate();

    const [allSchedules, setAllSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('division');
    const [fetchError, setFetchError] = useState(null);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const response = await fetch(`${API_URL}/api/tournaments`);
                if (response.ok) { const data = await response.json(); setAllSchedules(data); }
            } catch (error) { console.error("Failed to fetch all schedules:", error); }
        };
        fetchAll();
    }, []);

    useEffect(() => {
        if (!scheduleId && allSchedules.length > 0) {
            const latestScheduleId = allSchedules[0]._id;
            navigate(`/schedule/${latestScheduleId}`, { replace: true });
        }
    }, [allSchedules, scheduleId, navigate]);

    useEffect(() => {
        const fetchTournament = async (id) => {
            setIsLoading(true);
            setFetchError(null);
            setFilterText('');
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
            } finally { setIsLoading(false); }
        };
        if (scheduleId) { fetchTournament(scheduleId); }
        else { dispatch({ type: 'CLEAR_SCHEDULE' }); }
    }, [scheduleId, dispatch]);

    const handleDelete = async (e, idToDelete) => {
        e.preventDefault();
        if (!window.confirm('Are you sure you want to delete this schedule? This cannot be undone.')) return;
        try {
            const response = await fetch(`${API_URL}/api/tournaments/${idToDelete}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete schedule.');
            }
            setAllSchedules(prev => prev.filter(s => s._id !== idToDelete));
            if (scheduleId === idToDelete) navigate('/schedule');
        } catch (error) { alert(`Error: ${error.message}`); }
    };

    const handleStartOver = () => {
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

    const getEndTime = (startTime, duration) => {
        const [hour, minute] = startTime.split(':').map(Number);
        const startMinutes = hour * 60 + minute;
        const endMinutes = startMinutes + duration;
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = (endMinutes % 60).toString().padStart(2, '0');
        return formatTime12Hour(`${endHour}:${endMinute}`);
    };

    const masterScheduleGrid = useMemo(() => {
        if (!schedule?.games || !settings || !Array.isArray(settings.dayTimes)) return {};
        const gridData = {};
        const gameMap = new Map(schedule.games.map(g => [`${g.day}-${g.court}-${g.time}`, g]));
        for (let day = 1; day <= settings.days; day++) {
            const dayGames = schedule.games.filter(g => g.day === day);
            if (dayGames.length === 0) continue;
            const timeSlots = [...new Set(dayGames.map(g => g.time))].sort();
            const courts = [...Array(settings.courts).keys()].map(i => i + 1);
            const grid = {};
            timeSlots.forEach(time => {
                grid[time] = {};
                courts.forEach(court => {
                    grid[time][court] = gameMap.get(`${day}-${court}-${time}`) || null;
                });
            });
            gridData[`Day ${day}`] = { times: timeSlots, courts, grid };
        }
        return gridData;
    }, [schedule, settings]);

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
        if (!schedule?.games || !settings || !Array.isArray(settings.dayTimes)) return {};
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
            if (game) acc[key].push(game);
            else acc[key].push({ ...slot, type: 'empty' });
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

    const filteredDetailedData = useMemo(() => {
        let sourceData;
        if (viewMode === 'division') sourceData = gamesByDivision;
        else if (viewMode === 'court') sourceData = gamesByCourt;
        else if (viewMode === 'day') sourceData = gamesByDay;
        else if (viewMode === 'team') sourceData = gamesByTeam;
        else return {};
        if (!filterText) return sourceData;
        const lowerCaseFilter = filterText.toLowerCase();
        const filteredResult = {};
        for (const groupName in sourceData) {
            const filteredGames = sourceData[groupName].filter(game => {
                if (game.type === 'empty') return false;
                return (
                    (game.team1 && game.team1.toLowerCase().includes(lowerCaseFilter)) ||
                    (game.team2 && game.team2.toLowerCase().includes(lowerCaseFilter)) ||
                    (game.divisionName && game.divisionName.toLowerCase().includes(lowerCaseFilter))
                );
            });
            if (filteredGames.length > 0) filteredResult[groupName] = filteredGames;
        }
        return filteredResult;
    }, [filterText, viewMode, gamesByDivision, gamesByCourt, gamesByDay, gamesByTeam]);

    const renderGamesTable = (games) => (
        <table className="schedule-table">
            <thead>
            <tr><th>Day</th><th>Time Slot</th><th>Court</th><th>Team 1</th><th>Team 2</th><th>Division</th></tr>
            </thead>
            <tbody>
            {games.map((game, index) => (
                game.type === 'empty' ? (
                    <tr key={`${game.key}-${index}`} className="empty-slot"><td data-label="Day">{game.day}</td><td data-label="Time Slot">{formatTime12Hour(game.time)} - {getEndTime(game.time, settings.gameDuration)}</td><td data-label="Court">{`Court ${game.court}`}</td><td colSpan="3" className="empty-slot-text">-- Available --</td></tr>
                ) : (
                    <tr key={game.id || index}><td data-label="Day">{game.day}</td><td data-label="Time Slot">{formatTime12Hour(game.time)} - {getEndTime(game.time, settings.gameDuration)}</td><td data-label="Court">{`Court ${game.court}`}</td><td data-label="Team 1">{game.team1}</td><td data-label="Team 2">{game.team2}</td><td data-label="Division">{game.divisionName}</td></tr>
                )
            ))}
            </tbody>
        </table>
    );

    return (
        <div className="schedule-view-layout">
            <aside className="schedule-sidebar">
                <h3>Saved Schedules</h3>
                {allSchedules.length > 0 ? (
                    <ul className="schedule-list">
                        {allSchedules.map(s => (
                            <li key={s._id} className="schedule-list-item">
                                <NavLink to={`/schedule/${s._id}`}>{`Created: ${new Date(s.createdAt).toLocaleString()}`}</NavLink>
                                <button className="delete-button" title="Delete this schedule" onClick={(e) => handleDelete(e, s._id)}>×</button>
                            </li>
                        ))}
                    </ul>
                ) : (<p>No saved schedules found.</p>)}
            </aside>
            <section className="schedule-content">
                <ScheduleDetail
                    scheduleId={scheduleId} isLoading={isLoading} fetchError={fetchError}
                    schedule={schedule} settings={settings} handleStartOver={handleStartOver}
                    navigate={navigate} viewMode={viewMode} setViewMode={setViewMode}
                    filterText={filterText} setFilterText={setFilterText}
                    masterScheduleGrid={masterScheduleGrid} filteredDetailedData={filteredDetailedData}
                    renderGamesTable={renderGamesTable} formatTime12Hour={formatTime12Hour}
                />
            </section>
        </div>
    );
};

export default ScheduleView;