import React, { createContext, useReducer, useContext } from 'react';

const defaultInitialState = {
    "settings": {
        "courts": 3,
        "days": 2,
        "gameDuration": 60,
        "minBreak": 60,
        "maxBreak": 240, // This property has been re-added
        "dayTimes": [
            { "day": 1, "startTime": "08:00", "endTime": "20:00" },
            { "day": 2, "startTime": "09:00", "endTime": "20:00" }
        ]
    },
    "divisions": [],
    "schedule": null
};


const tournamentReducer = (state, action) => {
    switch (action.type) {
        case 'SET_FULL_STATE': {
            return { ...action.payload };
        }
        case 'SET_DIVISIONS':
            return {
                ...state,
                divisions: action.payload,
                schedule: null,
            };
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
            const type = action.payload.type;
            const isBracket = type === 'Championship' || type === 'Consolation';
            const newDivision = { id: new Date().getTime(), name: '', numTeams: isBracket ? 2 : 4, gameType: 'Pool Play', divisionType: type, teamNames: Array(isBracket ? 2 : 4).fill(''), };
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
            try {
                const { generateFullSchedule } = require('../utils/scheduleGenerator.js');
                const schedule = generateFullSchedule(state);
                return { ...state, schedule };
            } catch (e) {
                console.error("Error generating schedule:", e);
                return { ...state, schedule: { error: "A critical error occurred.", games: [] } };
            }
        }
        case 'CLEAR_SCHEDULE': return { ...state, schedule: null };
        case 'RESET_STATE': return defaultInitialState;
        default: return state;
    }
};

const TournamentContext = createContext();

export const TournamentProvider = ({ children }) => {
    const [state, dispatch] = useReducer(tournamentReducer, defaultInitialState);
    return ( <TournamentContext.Provider value={{ state, dispatch }}> {children} </TournamentContext.Provider> );
};

export const useTournament = () => {
    return useContext(TournamentContext);
};