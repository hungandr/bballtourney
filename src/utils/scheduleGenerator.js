// src/utils/scheduleGenerator.js

function createTimeSlots(settings) {
    const slots = [];
    const { courts, dayTimes, gameDuration } = settings;
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
                const absTime = ((day - 1) * 24 * 60) + currentTime;
                slots.push({ day, time: `${hours}:${minutes}`, court, absTime });
                currentTime += gameMinutes;
            }
        }
    });
    return slots;
}

function generateRoundRobinGames(teams) {
    const games = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            games.push({ team1: i, team2: j });
        }
    }
    return games;
}

function isMoveValid(game, slot, teamStates, settings) {
    const { minBreak: effectiveMinBreak, maxBreak } = settings;
    const team1State = teamStates.get(`${game.division.id}-${game.team1}`);
    const team2State = teamStates.get(`${game.division.id}-${game.team2}`);

    if (!team1State || !team2State) return false;

    if ((team1State.gamesOnDay[slot.day] || 0) >= 2 || (team2State.gamesOnDay[slot.day] || 0) >= 2) {
        return false;
    }

    const lastGame1 = team1State.lastGame;
    if (lastGame1.day === slot.day) {
        const breakTime = slot.absTime - lastGame1.endTime;
        if (breakTime < effectiveMinBreak || breakTime > maxBreak) return false;
    }
    const lastGame2 = team2State.lastGame;
    if (lastGame2.day === slot.day) {
        const breakTime = slot.absTime - lastGame2.endTime;
        if (breakTime < effectiveMinBreak || breakTime > maxBreak) return false;
    }

    return true;
}

function schedulePoolPlayPhase(poolPlayDivisions, availableSlots, settings) {
    if (poolPlayDivisions.length === 0) {
        return { scheduledGames: [], occupiedSlots: new Set(), divisionEndTimes: new Map(), error: null };
    }

    const allGames = [];
    const divisionMap = new Map();
    poolPlayDivisions.forEach(division => {
        const games = generateRoundRobinGames(division.teams).map(g => ({ ...g, division, phase: 'Pool Play' }));
        allGames.push(...games);
        divisionMap.set(division.id, division);
    });

    let scheduledGames = [];
    let unscheduledGames = [...allGames];

    const tempSlots = new Set(availableSlots.map(s => `${s.day}-${s.court}-${s.time}`));

    const MAX_RETRIES = 500;
    let retries = 0;

    while(unscheduledGames.length > 0 && retries < MAX_RETRIES) {
        retries++;
        let gamePlacedThisIteration = false;

        const gameToPlace = unscheduledGames.shift();

        for (const slot of availableSlots) {
            const slotKey = `${slot.day}-${slot.court}-${slot.time}`;
            if (tempSlots.has(slotKey)) {
                const currentScheduleState = buildScheduleState(scheduledGames, poolPlayDivisions, settings.gameDuration);
                if (isMoveValid(gameToPlace, slot, currentScheduleState.teamStates, settings)) {
                    const scheduledGame = createScheduledGame(gameToPlace, slot);
                    scheduledGames.push(scheduledGame);
                    tempSlots.delete(slotKey);
                    gamePlacedThisIteration = true;
                    break;
                }
            }
        }
        if(gamePlacedThisIteration) continue;

        for (let i = 0; i < scheduledGames.length; i++) {
            const originalGameToEvict = scheduledGames[i];
            const gameToEvict = {
                team1: originalGameToEvict.team1_index,
                team2: originalGameToEvict.team2_index,
                division: originalGameToEvict.division,
            };
            const originalSlot = { day: originalGameToEvict.day, time: originalGameToEvict.time, court: originalGameToEvict.court, absTime: originalGameToEvict.absTime };

            const scheduleWithoutEvicted = scheduledGames.filter(g => g.id !== originalGameToEvict.id);
            const stateWithoutEvicted = buildScheduleState(scheduleWithoutEvicted, poolPlayDivisions, settings.gameDuration);

            if(isMoveValid(gameToPlace, originalSlot, stateWithoutEvicted.teamStates, settings)) {
                let newSlotForEvicted = null;
                for (const slot of availableSlots) {
                    const slotKey = `${slot.day}-${slot.court}-${slot.time}`;
                    if(tempSlots.has(slotKey)) {
                        const tempSchedule = [...scheduleWithoutEvicted, createScheduledGame(gameToPlace, originalSlot)];
                        const tempState = buildScheduleState(tempSchedule, poolPlayDivisions, settings.gameDuration);
                        if(isMoveValid(gameToEvict, slot, tempState.teamStates, settings)) {
                            newSlotForEvicted = slot;
                            break;
                        }
                    }
                }

                if (newSlotForEvicted) {
                    scheduledGames.splice(i, 1);
                    tempSlots.add(`${originalSlot.day}-${originalSlot.court}-${originalSlot.time}`);
                    scheduledGames.push(createScheduledGame(gameToPlace, originalSlot));
                    tempSlots.delete(`${originalSlot.day}-${originalSlot.court}-${originalSlot.time}`);
                    scheduledGames.push(createScheduledGame(gameToEvict, newSlotForEvicted));
                    tempSlots.delete(`${newSlotForEvicted.day}-${newSlotForEvicted.court}-${newSlotForEvicted.time}`);

                    gamePlacedThisIteration = true;
                    break;
                }
            }
        }

        if (!gamePlacedThisIteration) {
            unscheduledGames.push(gameToPlace);
        }
    }

    if (unscheduledGames.length > 0) {
        return { error: `Could not schedule all Pool Play games. After extensive searching, ${unscheduledGames.length} games could not be placed.` };
    }

    const finalState = buildScheduleState(scheduledGames, poolPlayDivisions, settings.gameDuration);
    return {
        scheduledGames: scheduledGames.sort((a,b) => a.absTime - b.absTime),
        occupiedSlots: finalState.occupiedSlots,
        divisionEndTimes: finalState.divisionEndTimes,
        error: null
    };
}

function buildScheduleState(games, divisions, gameDuration) {
    const teamStates = new Map();
    const divisionEndTimes = new Map();
    const occupiedSlots = new Set();

    divisions.forEach(div => {
        div.teams.forEach((_, index) => {
            teamStates.set(`${div.id}-${index}`, {
                lastGame: { endTime: 0, day: 0 },
                gamesOnDay: {}
            });
        });
    });

    const sortedGames = [...games].sort((a, b) => a.absTime - b.absTime);

    for (const game of sortedGames) {
        const team1Id = `${game.division.id}-${game.team1_index}`;
        const team2Id = `${game.division.id}-${game.team2_index}`;
        const divisionId = game.division.id;

        const gameEndTime = game.absTime + gameDuration;
        const newGameInfo = { endTime: gameEndTime, day: game.day };

        const team1State = teamStates.get(team1Id);
        team1State.lastGame = newGameInfo;
        team1State.gamesOnDay[game.day] = (team1State.gamesOnDay[game.day] || 0) + 1;

        const team2State = teamStates.get(team2Id);
        team2State.lastGame = newGameInfo;
        team2State.gamesOnDay[game.day] = (team2State.gamesOnDay[game.day] || 0) + 1;

        const currentDivEndTime = divisionEndTimes.get(divisionId) || 0;
        divisionEndTimes.set(divisionId, Math.max(currentDivEndTime, gameEndTime));
        occupiedSlots.add(`${game.day}-${game.court}-${game.time}`);
    }

    return { teamStates, divisionEndTimes, occupiedSlots };
}

function createScheduledGame(game, slot) {
    const { division, team1, team2, phase } = game;
    const team1Obj = division.teams[team1];
    const team2Obj = division.teams[team2];
    return {
        ...slot,
        id: `game-${Math.random()}`,
        divisionName: division.name,
        team1: team1Obj.name,
        team2: team2Obj.name,
        phase: phase,
        division: division,
        team1_index: team1,
        team2_index: team2,
    };
}

function scheduleBracketPhase(bracketDivisions, availableSlots, divisionEndTimes, settings) {
    if (bracketDivisions.length === 0) {
        return { scheduledGames: [], error: null };
    }

    // --- THIS IS THE FIX ---
    // A divisionMap is created here to be used by the helper function.
    const divisionMap = new Map();
    bracketDivisions.forEach(division => {
        divisionMap.set(division.id, division);
    });
    // --- END OF FIX ---

    const divisionStates = new Map();
    let totalGamesToSchedule = 0;

    for (const division of bracketDivisions) {
        const gamesToSchedule = generateRoundRobinGames(division.teams).map(g => ({ ...g, division, phase: division.divisionType }));

        let minStartTime = 0;
        if (division.poolPlayDependencies && division.poolPlayDependencies.length > 0) {
            for (const depId of division.poolPlayDependencies) {
                const depEndTime = divisionEndTimes.get(depId) || divisionEndTimes.get(parseInt(depId)) || 0;
                if (depEndTime === 0) {
                    return { error: `Could not schedule bracket division "${division.name}" because its dependent pool division was not found or did not finish.` };
                }
                minStartTime = Math.max(minStartTime, depEndTime);
            }
        }

        minStartTime += settings.minBreak;

        const teamLastGameInfo = new Map();
        division.teams.forEach((_, index) => teamLastGameInfo.set(index, { endTime: minStartTime, day: 0 }));

        divisionStates.set(division.id, { division, teamLastGameInfo, gamesToSchedule });
        totalGamesToSchedule += gamesToSchedule.length;
    }

    const scheduledGames = [];
    const effectiveMinBreak = Math.max(1, settings.minBreak);

    for (const slot of availableSlots) {
        if (scheduledGames.length === totalGamesToSchedule) break;

        let candidateGames = [];
        for (const state of divisionStates.values()) {
            const divMinStartTime = state.teamLastGameInfo.get(0).endTime;
            if (slot.absTime < divMinStartTime) continue;

            for (const game of state.gamesToSchedule) {
                const lastGame1 = state.teamLastGameInfo.get(game.team1);
                const lastGame2 = state.teamLastGameInfo.get(game.team2);

                if (slot.absTime >= lastGame1.endTime && slot.absTime >= lastGame2.endTime) {
                    candidateGames.push({ game, divisionId: state.division.id });
                }
            }
        }
        if (candidateGames.length === 0) continue;

        candidateGames.sort((a, b) => String(a.divisionId).localeCompare(String(b.divisionId)) || a.game.team1 - b.game.team1);

        const bestCandidate = candidateGames[0];
        const { game } = bestCandidate;
        const scheduledGame = createScheduledGame(game, slot);
        scheduledGames.push(scheduledGame);

        const newGameInfo = { endTime: slot.absTime + settings.gameDuration + effectiveMinBreak, day: slot.day };
        const state = divisionStates.get(game.division.id);
        state.gamesToSchedule.splice(state.gamesToSchedule.indexOf(game), 1);
        state.teamLastGameInfo.set(game.team1, newGameInfo);
        state.teamLastGameInfo.set(game.team2, newGameInfo);
    }

    if (scheduledGames.length !== totalGamesToSchedule) {
        return { error: `Could not schedule all bracket games. ${totalGamesToSchedule - scheduledGames.length} games remaining. This may be due to lack of available time after dependent pool games finish.` };
    }

    return { scheduledGames, error: null };
}

export function generateFullSchedule(tournamentState) {
    const { settings, divisions } = tournamentState;
    const validDivisions = divisions.filter(d => d.teams && d.teams.length >= 2);

    const poolPlayDivisions = validDivisions.filter(d => d.divisionType === 'Pool Play');
    const consolationDivisions = validDivisions.filter(d => d.divisionType === 'Consolation');
    const championshipDivisions = validDivisions.filter(d => d.divisionType === 'Championship');

    const allSlots = createTimeSlots(settings);
    allSlots.sort((a, b) => a.absTime - b.absTime || a.court - b.court);

    const poolPlayResult = schedulePoolPlayPhase(poolPlayDivisions, allSlots, settings);
    if (poolPlayResult.error) {
        return poolPlayResult;
    }
    const poolPlayGames = poolPlayResult.scheduledGames;
    const occupiedSlots = poolPlayResult.occupiedSlots;
    const divisionEndTimes = poolPlayResult.divisionEndTimes;

    const remainingSlots = allSlots.filter(s => !occupiedSlots.has(`${s.day}-${s.court}-${s.time}`));

    const bracketDivisions = [...consolationDivisions, ...championshipDivisions];
    const bracketResult = scheduleBracketPhase(bracketDivisions, remainingSlots, divisionEndTimes, settings);
    if (bracketResult.error) {
        return bracketResult;
    }
    const bracketGames = bracketResult.scheduledGames;

    const allScheduledGames = [...poolPlayGames, ...bracketGames];

    const totalGamesToSchedule = validDivisions.reduce((sum, div) => {
        return sum + (div.teams.length * (div.teams.length - 1) / 2);
    }, 0);

    if (allScheduledGames.length < totalGamesToSchedule) {
        return { error: `Scheduling failed. Only ${allScheduledGames.length} of ${totalGamesToSchedule} games could be placed. Try adding more time or courts.` };
    }

    allScheduledGames.sort((a, b) => a.absTime - b.absTime || a.court - b.court);
    return { error: null, games: allScheduledGames };
}