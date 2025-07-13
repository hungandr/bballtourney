import React, { createContext, useReducer, useContext } from 'react';

// Helper function to create default availability based on number of days
const createDefaultAvailability = (numDays) => {
    const availability = {};
    for (let i = 1; i <= numDays; i++) {
        availability[i] = { morning: true, afternoon: true, evening: true };
    }
    return availability;
};

// Helper to create a new team object
const createNewTeam = (numDays) => ({
    id: new Date().getTime() + Math.random(),
    name: '',
    availability: createDefaultAvailability(numDays)
});


const defaultInitialState = {
    "settings": {
        "courts": 3,
        "days": 2,
        "gameDuration": 60,
        "minBreak": 60,
        "maxBreak": 240,
        "dayTimes": [
            { "day": 1, "startTime": "08:00", "endTime": "19:00" },
            { "day": 2, "startTime": "08:00", "endTime": "18:00" }
        ]
    },
    "divisions": [],
    "schedule": null
};


const tournamentReducer = (state, action) => {
    switch (action.type) {
        case 'SET_FULL_STATE': {
            const loadedState = action.payload;
            if (loadedState.divisions) {
                loadedState.divisions.forEach(div => {
                    if (div.teamNames && !div.teams) {
                        div.teams = div.teamNames.map(name => ({
                            id: new Date().getTime() + Math.random(),
                            name: name,
                            availability: createDefaultAvailability(loadedState.settings.days)
                        }));
                        delete div.teamNames;
                    }
                });
            }
            return { ...loadedState };
        }
        case 'SET_DIVISIONS':
            return { ...state, divisions: action.payload, schedule: null, };
        case 'UPDATE_SETTINGS': {
            const newSettings = { ...state.settings, ...action.payload };
            const oldNumDays = state.settings.days;
            const newNumDays = action.payload.days !== undefined ? parseInt(action.payload.days) || 1 : oldNumDays;

            if (action.payload.days !== undefined) {
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

            const updatedState = { ...state, settings: newSettings };

            if (newNumDays !== oldNumDays) {
                updatedState.divisions = updatedState.divisions.map(div => ({
                    ...div,
                    teams: (div.teams || []).map(team => ({
                        ...team,
                        availability: createDefaultAvailability(newNumDays)
                    }))
                }));
            }
            return updatedState;
        }
        case 'ADD_DIVISION': {
            const type = action.payload.type;
            const isBracket = type === 'Championship' || type === 'Consolation';
            const numTeams = isBracket ? 2 : 4;
            const newDivision = {
                id: new Date().getTime(),
                name: '',
                numTeams,
                gameType: 'Pool Play',
                divisionType: type,
                teams: Array.from({ length: numTeams }, () => createNewTeam(state.settings.days)),
                // This is the new property for the UI feature
                poolPlayDependencies: []
            };
            return { ...state, divisions: [...state.divisions, newDivision] };
        }
        case 'UPDATE_DIVISION': {
            return { ...state, divisions: state.divisions.map((div) => {
                    if (div.id === action.payload.id) {
                        const updatedDivision = { ...div, ...action.payload.data };
                        if (action.payload.data.numTeams !== undefined) {
                            const newNumTeams = parseInt(action.payload.data.numTeams) || 0;
                            const oldTeams = updatedDivision.teams || [];
                            const newTeams = [];
                            for (let i = 0; i < newNumTeams; i++) {
                                if (oldTeams[i]) {
                                    newTeams.push(oldTeams[i]);
                                } else {
                                    newTeams.push(createNewTeam(state.settings.days));
                                }
                            }
                            updatedDivision.teams = newTeams;
                        }
                        return updatedDivision;
                    }
                    return div;
                }) };
        }
        case 'UPDATE_TEAM': {
            return { ...state, divisions: state.divisions.map(div => {
                    if (div.id === action.payload.divisionId) {
                        return {
                            ...div,
                            teams: div.teams.map(team =>
                                team.id === action.payload.teamId
                                    ? { ...team, ...action.payload.data }
                                    : team
                            )
                        };
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