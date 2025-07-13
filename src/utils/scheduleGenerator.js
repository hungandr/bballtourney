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

/**
 * Schedules all pool play games. This function runs first.
 * It returns the games, the slots they occupy, and a map of when each division finishes.
 */
function schedulePoolPlayPhase(poolPlayDivisions, availableSlots, settings) {
    if (poolPlayDivisions.length === 0) {
        return { scheduledGames: [], occupiedSlots: new Set(), divisionEndTimes: new Map(), error: null };
    }

    const divisionStates = new Map();
    let totalGamesToSchedule = 0;

    poolPlayDivisions.forEach(division => {
        const teamLastGameInfo = new Map();
        const teamGamesOnDay = new Map();
        let gamesToSchedule = generateRoundRobinGames(division.teams).map(g => ({ ...g, division, phase: 'Pool Play' }));
        division.teams.forEach((_, index) => {
            teamLastGameInfo.set(index, { endTime: 0, day: 0 });
            teamGamesOnDay.set(index, {});
        });
        divisionStates.set(division.id, { division, teamLastGameInfo, teamGamesOnDay, gamesToSchedule });
        totalGamesToSchedule += gamesToSchedule.length;
    });

    const scheduledGames = [];
    const occupiedSlots = new Set();
    const divisionEndTimes = new Map();

    const effectiveMinBreak = Math.max(1, settings.minBreak);
    const maxBreak = settings.maxBreak || Infinity;

    for (const slot of availableSlots) {
        if (scheduledGames.length === totalGamesToSchedule) break;

        let candidateGames = [];
        for (const state of divisionStates.values()) {
            for (const game of state.gamesToSchedule) {
                const team1GamesToday = state.teamGamesOnDay.get(game.team1)?.[slot.day] || 0;
                const team2GamesToday = state.teamGamesOnDay.get(game.team2)?.[slot.day] || 0;
                if (team1GamesToday >= 2 || team2GamesToday >= 2) continue;

                const lastGame1 = state.teamLastGameInfo.get(game.team1);
                const lastGame2 = state.teamLastGameInfo.get(game.team2);
                let isEligible = true;
                if (lastGame1.day !== 0 && slot.day === lastGame1.day) {
                    const breakTime1 = slot.absTime - lastGame1.endTime;
                    if (breakTime1 < effectiveMinBreak || breakTime1 > maxBreak) isEligible = false;
                }
                if (isEligible && lastGame2.day !== 0 && slot.day === lastGame2.day) {
                    const breakTime2 = slot.absTime - lastGame2.endTime;
                    if (breakTime2 < effectiveMinBreak || breakTime2 > maxBreak) isEligible = false;
                }
                if (isEligible) candidateGames.push({ game, divisionId: state.division.id });
            }
        }
        if (candidateGames.length === 0) continue;

        candidateGames.forEach(candidate => {
            let score = 0;
            const state = divisionStates.get(candidate.divisionId);
            const team1GamesToday = state.teamGamesOnDay.get(candidate.game.team1)[slot.day] || 0;
            const team2GamesToday = state.teamGamesOnDay.get(candidate.game.team2)[slot.day] || 0;
            if (team1GamesToday === 0) score += 1000;
            if (team2GamesToday === 0) score += 1000;
            candidate.score = score;
        });

        candidateGames.sort((a, b) => b.score - a.score || String(a.divisionId).localeCompare(String(b.divisionId)) || a.game.team1 - b.game.team1);

        const bestCandidate = candidateGames[0];
        const { game, divisionId } = bestCandidate;
        const state = divisionStates.get(divisionId);
        const team1Obj = state.division.teams[game.team1];
        const team2Obj = state.division.teams[game.team2];
        const scheduledGame = { id: `game-${Math.random()}`, ...slot, divisionName: state.division.name, gamePhase: game.phase, team1: team1Obj.name.trim(), team2: team2Obj.name.trim() };

        scheduledGames.push(scheduledGame);
        occupiedSlots.add(`${slot.day}-${slot.court}-${slot.time}`);

        const gameEndTime = slot.absTime + settings.gameDuration;
        const currentDivEndTime = divisionEndTimes.get(divisionId) || 0;
        divisionEndTimes.set(divisionId, Math.max(currentDivEndTime, gameEndTime));

        const newGameInfo = { endTime: gameEndTime, day: slot.day };
        state.gamesToSchedule.splice(state.gamesToSchedule.indexOf(game), 1);
        state.teamLastGameInfo.set(game.team1, newGameInfo);
        state.teamLastGameInfo.set(game.team2, newGameInfo);
        state.teamGamesOnDay.get(game.team1)[slot.day] = (state.teamGamesOnDay.get(game.team1)[slot.day] || 0) + 1;
        state.teamGamesOnDay.get(game.team2)[slot.day] = (state.teamGamesOnDay.get(game.team2)[slot.day] || 0) + 1;
    }

    if (scheduledGames.length !== totalGamesToSchedule) {
        return { error: `Could not schedule all Pool Play games due to time constraints. ${totalGamesToSchedule - scheduledGames.length} games remaining.` };
    }
    return { scheduledGames, occupiedSlots, divisionEndTimes, error: null };
}

/**
 * Schedules all bracket games (Consolation & Championship).
 * This function runs second, after pool play is complete.
 */
function scheduleBracketPhase(bracketDivisions, availableSlots, divisionEndTimes, settings) {
    if (bracketDivisions.length === 0) {
        return { scheduledGames: [], error: null };
    }

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

        // --- THIS IS THE RULE IMPLEMENTATION ---
        // After finding the latest pool game end time, add the required break.
        // A bracket game cannot start until this calculated time.
        minStartTime += settings.minBreak;

        const teamLastGameInfo = new Map();
        // Initialize all teams in the bracket with the same earliest start time.
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
        const { game, divisionId } = bestCandidate;
        const state = divisionStates.get(divisionId);
        const team1Obj = state.division.teams[game.team1];
        const team2Obj = state.division.teams[game.team2];
        const scheduledGame = { id: `game-${Math.random()}`, ...slot, divisionName: state.division.name, gamePhase: game.phase, team1: team1Obj.name.trim(), team2: team2Obj.name.trim() };

        scheduledGames.push(scheduledGame);

        // This is the end time for the *next* bracket game for these teams
        const newGameInfo = { endTime: slot.absTime + settings.gameDuration + effectiveMinBreak, day: slot.day };
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

    // 1. Schedule all pool play games first
    const poolPlayResult = schedulePoolPlayPhase(poolPlayDivisions, allSlots, settings);
    if (poolPlayResult.error) {
        return poolPlayResult;
    }
    const poolPlayGames = poolPlayResult.scheduledGames;
    const occupiedSlots = poolPlayResult.occupiedSlots;
    const divisionEndTimes = poolPlayResult.divisionEndTimes;

    const remainingSlots = allSlots.filter(s => !occupiedSlots.has(`${s.day}-${s.court}-${s.time}`));

    // 2. & 3. Schedule all bracket games (Consolation and Championship)
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