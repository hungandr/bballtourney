// src/context/TournamentContext.js
import React, { createContext, useReducer, useContext } from 'react';
import { generateFullSchedule } from '../utils/scheduleGenerator.js';

// 1. Define the initial state (NO CHANGES HERE)
const initialState = {
    settings: {
        courts: 3,
        days: 2,
        gameDuration: 60,
        startTime: '09:00',
        endTime: '19:00',
    },
    divisions: [],
    schedule: null,
};

// 2. Create the reducer function to handle actions
const tournamentReducer = (state, action) => {
    switch (action.type) {
        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: { ...state.settings, ...action.payload },
            };
        case 'ADD_DIVISION':
            const newDivision = {
                id: new Date().getTime(),
                name: '',
                type: 'round-robin',
                // CHANGED: Instead of numTeams, we have a subDivisions array.
                // We'll start it with one default sub-division.
                subDivisions: [{ id: new Date().getTime() + 1, name: 'Pool A', numTeams: 4 }],
            };
            return {
                ...state,
                divisions: [...state.divisions, newDivision],
            };
        case 'UPDATE_DIVISION':
            return {
                ...state,
                divisions: state.divisions.map((div) =>
                    div.id === action.payload.id ? { ...div, ...action.payload.data } : div
                ),
            };
        case 'REMOVE_DIVISION':
            return {
                ...state,
                divisions: state.divisions.filter((div) => div.id !== action.payload.id),
            };

        // --- NEW ACTIONS FOR SUB-DIVISIONS ---
        case 'ADD_SUB_DIVISION': {
            const { divisionId } = action.payload;
            return {
                ...state,
                divisions: state.divisions.map(div => {
                    if (div.id === divisionId) {
                        const newSubDivision = {
                            id: new Date().getTime(),
                            name: `Pool ${String.fromCharCode(65 + div.subDivisions.length)}`, // Creates Pool B, C, etc.
                            numTeams: 4,
                        };
                        return { ...div, subDivisions: [...div.subDivisions, newSubDivision] };
                    }
                    return div;
                }),
            };
        }
        case 'REMOVE_SUB_DIVISION': {
            const { divisionId, subDivisionId } = action.payload;
            return {
                ...state,
                divisions: state.divisions.map(div => {
                    if (div.id === divisionId) {
                        return { ...div, subDivisions: div.subDivisions.filter(sub => sub.id !== subDivisionId) };
                    }
                    return div;
                }),
            };
        }
        case 'UPDATE_SUB_DIVISION': {
            const { divisionId, subDivisionId, data } = action.payload;
            return {
                ...state,
                divisions: state.divisions.map(div => {
                    if (div.id === divisionId) {
                        const updatedSubDivisions = div.subDivisions.map(sub => {
                            if (sub.id === subDivisionId) {
                                return { ...sub, ...data };
                            }
                            return sub;
                        });
                        return { ...div, subDivisions: updatedSubDivisions };
                    }
                    return div;
                }),
            };
        }
        // --- NEW ACTIONS ---
        case 'GENERATE_SCHEDULE': {
            try {
                const schedule = generateFullSchedule(state);
                return { ...state, schedule };
            } catch (e) {
                console.error("Error generating schedule:", e);
                return { ...state, schedule: { error: "A critical error occurred during schedule generation.", games: [] } };
            }
        }
        case 'CLEAR_SCHEDULE': {
            return { ...state, schedule: null };
        }
        // We will add a 'GENERATE_SCHEDULE' action later
        default:
            return state;
    }
};

// 3, 4, 5: No changes needed for Context, Provider, or custom hook
const TournamentContext = createContext();

export const TournamentProvider = ({ children }) => {
    const [state, dispatch] = useReducer(tournamentReducer, initialState);

    return (
        <TournamentContext.Provider value={{ state, dispatch }}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => {
    return useContext(TournamentContext);
};