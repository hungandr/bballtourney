// src/context/TournamentContext.js
import React, { createContext, useReducer, useContext } from 'react';
// We will call the generator from the component now, so it's removed from here
// import { generateFullSchedule } from '../utils/scheduleGenerator.js';

// --- Default initial state remains the same ---
const defaultInitialState = {
    "settings": {
        "courts": 3,
        "days": 2,
        "gameDuration": 60,
        "minBreak": 60,
        "maxBreak": 240,
        "dayTimes": [
            { "day": 1, "startTime": "08:00", "endTime": "20:00" },
            { "day": 2, "startTime": "09:00", "endTime": "20:00" }
        ]
    },
    "divisions": [
        { "id": 1751796598272, "name": "men white group 1", "numTeams": 3, "gameType": "Pool Play", "teamNames": ["", "", ""] },
        { "id": 1751796611552, "name": "men white group 2", "numTeams": 3, "gameType": "Pool Play", "teamNames": ["", "", ""] },
        { "id": 1751796617040, "name": "men grey group 1", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] },
        { "id": 1751796631594, "name": "men grey group 2", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] },
        { "id": 1751796635458, "name": "men 40+ group 1", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] },
        { "id": 1751796645817, "name": "men 40+ group 2", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] },
        { "id": 1751796650457, "name": "men 50+ group 1", "numTeams": 3, "gameType": "Pool Play", "teamNames": ["", "", ""] },
        { "id": 1751796655718, "name": "men 50+ group 2", "numTeams": 3, "gameType": "Pool Play", "teamNames": ["", "", ""] },
        { "id": 1751796659626, "name": "men 50+ group 3", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] },
        { "id": 1751796667299, "name": "women group 1", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] },
        { "id": 1751796671927, "name": "women group 2", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] },
        { "id": 1751796674978, "name": "women group 3", "numTeams": 4, "gameType": "Pool Play", "teamNames": ["", "", "", ""] }
    ],
    "schedule": null
};


const tournamentReducer = (state, action) => {
    switch (action.type) {
        // --- NEW ACTION to load a complete state from the server ---
        case 'SET_FULL_STATE': {
            return { ...action.payload };
        }
        case 'UPDATE_SETTINGS': {
            const newSettings = { ...state.settings, ...action.payload };
            if (action.payload.days !== undefined) {
                const newNumDays = parseInt(action.payload.days) || 1;
                const currentDayTimes = newSettings.dayTimes || [];
                const newDayTimes = [];
                for (let i = 0; i < newNumDays; i++) {
                    if (currentDayTimes[i]) {
                        newDayTimes.push({ ...currentDayTimes[i], day: i + 1 });
                    } else {
                        const previousDay = newDayTimes[i-1] || { startTime: '09:00', endTime: '19:00' };
                        newDayTimes.push({ day: i + 1, startTime: previousDay.startTime, endTime: previousDay.endTime });
                    }
                }
                newSettings.dayTimes = newDayTimes;
            }
            return { ...state, settings: newSettings };
        }
        case 'ADD_DIVISION': {
            const newDivision = {
                id: new Date().getTime(),
                name: '',
                numTeams: 4,
                gameType: 'Pool Play',
                teamNames: Array(4).fill(''),
            };
            return { ...state, divisions: [...state.divisions, newDivision] };
        }
        case 'UPDATE_DIVISION': {
            return { ...state, divisions: state.divisions.map((div) => {
                    if (div.id === action.payload.id) {
                        const updatedDivision = { ...div, ...action.payload.data };
                        if (action.payload.data.numTeams !== undefined) {
                            const newNumTeams = parseInt(action.payload.data.numTeams) || 0;
                            const oldTeamNames = updatedDivision.teamNames || [];
                            const newTeamNames = Array(newNumTeams).fill('');
                            for (let i = 0; i < Math.min(newNumTeams, oldTeamNames.length); i++) {
                                newTeamNames[i] = oldTeamNames[i];
                            }
                            updatedDivision.teamNames = newTeamNames;
                        }
                        return updatedDivision;
                    }
                    return div;
                }) };
        }
        case 'REMOVE_DIVISION': {
            return { ...state, divisions: state.divisions.filter((div) => div.id !== action.payload.id) };
        }
        case 'GENERATE_SCHEDULE': {
            // This now just generates the schedule in memory. Saving is a separate step.
            try {
                // We need to import it here to avoid circular dependency issues at the module level.
                const { generateFullSchedule } = require('../utils/scheduleGenerator.js');
                const schedule = generateFullSchedule(state);
                return { ...state, schedule };
            } catch (e) {
                console.error("Error generating schedule:", e);
                return { ...state, schedule: { error: "A critical error occurred.", games: [] } };
            }
        }
        case 'CLEAR_SCHEDULE': return { ...state, schedule: null };
        default: return state;
    }
};

const TournamentContext = createContext();

export const TournamentProvider = ({ children }) => {
    // We removed the localStorage initializer and the useEffect hook
    const [state, dispatch] = useReducer(tournamentReducer, defaultInitialState);

    return (
        <TournamentContext.Provider value={{ state, dispatch }}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => {
    return useContext(TournamentContext);
};