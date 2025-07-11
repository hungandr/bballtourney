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
            games.push({ team1: teams[i], team2: teams[j] });
        }
    }
    return games;
}

function scheduleBracketPhase(divisionsToSchedule, endBeforeTime, availableSlots, settings) {
    if (divisionsToSchedule.length === 0) return { scheduledGames: [], earliestGameStartTime: endBeforeTime, error: null };
    const divisionStates = new Map();
    let totalGamesToSchedule = 0;
    divisionsToSchedule.forEach(division => {
        const teamNextGameStartTime = new Map();
        let gamesToSchedule = generateRoundRobinGames(Array.from({ length: division.numTeams }, (_, i) => `${division.id}-Team${i + 1}`)).map(g => ({ ...g, division, phase: division.divisionType }));
        gamesToSchedule.forEach(g => [g.team1, g.team2].forEach(teamId => teamNextGameStartTime.set(teamId, Infinity)));
        divisionStates.set(division.id, { division, teamNextGameStartTime, gamesToSchedule });
        totalGamesToSchedule += gamesToSchedule.length;
    });
    const scheduledGames = [];
    let earliestGameStartTime = endBeforeTime;
    const effectiveMinBreak = Math.max(1, settings.minBreak);
    const slotsByTime = new Map();
    for (const slot of availableSlots) {
        if (!slotsByTime.has(slot.absTime)) slotsByTime.set(slot.absTime, []);
        slotsByTime.get(slot.absTime).push(slot);
    }
    const sortedTimes = Array.from(slotsByTime.keys()).sort((a, b) => b - a);
    for (const time of sortedTimes) {
        if (scheduledGames.length === totalGamesToSchedule) break;
        if (time + settings.gameDuration > endBeforeTime) continue;
        const slotsForThisTime = slotsByTime.get(time);
        for (const slot of slotsForThisTime) {
            if (scheduledGames.length === totalGamesToSchedule) break;
            let candidateGames = [];
            for (const state of divisionStates.values()) {
                for (const game of state.gamesToSchedule) {
                    const nextGameStart1 = state.teamNextGameStartTime.get(game.team1);
                    const nextGameStart2 = state.teamNextGameStartTime.get(game.team2);
                    if (slot.absTime + settings.gameDuration <= nextGameStart1 - effectiveMinBreak && slot.absTime + settings.gameDuration <= nextGameStart2 - effectiveMinBreak) {
                        candidateGames.push({ game, divisionId: state.division.id });
                    }
                }
            }
            if (candidateGames.length === 0) continue;
            candidateGames.sort((a, b) => {
                if (a.divisionId !== b.divisionId) return String(a.divisionId).localeCompare(String(b.divisionId));
                return String(a.game.team1).localeCompare(String(b.game.team1));
            });
            const bestCandidate = candidateGames[0];
            const { game, divisionId } = bestCandidate;
            const state = divisionStates.get(divisionId);
            const formatTeamName = (teamId) => {
                const teamNumber = parseInt(teamId.split('-Team').pop());
                const customName = state.division.teamNames?.[teamNumber - 1];
                return customName?.trim() || `${state.division.name} - Team ${teamNumber}`;
            };
            scheduledGames.push({ id: `game-${Math.random()}`, ...slot, divisionName: state.division.name, gamePhase: game.phase, team1: formatTeamName(game.team1), team2: formatTeamName(game.team2) });
            earliestGameStartTime = Math.min(earliestGameStartTime, slot.absTime);
            state.gamesToSchedule.splice(state.gamesToSchedule.indexOf(game), 1);
            state.teamNextGameStartTime.set(game.team1, slot.absTime);
            state.teamNextGameStartTime.set(game.team2, slot.absTime);
        }
        if (scheduledGames.length === totalGamesToSchedule) break;
    }
    if (scheduledGames.length !== totalGamesToSchedule) {
        return { error: `Could not schedule all games for the ${divisionsToSchedule[0]?.divisionType} phase. ${totalGamesToSchedule - scheduledGames.length} games remaining.` };
    }
    return { scheduledGames, earliestGameStartTime, error: null };
}

function schedulePoolPlayPhase(divisionsToSchedule, availableSlots, settings) {
    if (divisionsToSchedule.length === 0) return { scheduledGames: [], error: null };

    const divisionStates = new Map();
    let totalGamesToSchedule = 0;
    divisionsToSchedule.forEach(division => {
        const teamLastGameInfo = new Map();
        const teamGamesOnDay = new Map();
        let gamesToSchedule = generateRoundRobinGames(Array.from({ length: division.numTeams }, (_, i) => `${division.id}-Team${i + 1}`)).map(g => ({ ...g, division, phase: 'Pool Play' }));
        gamesToSchedule.forEach(g => [g.team1, g.team2].forEach(teamId => {
            teamLastGameInfo.set(teamId, { endTime: 0, day: 0 });
            teamGamesOnDay.set(teamId, {});
        }));
        divisionStates.set(division.id, { division, teamLastGameInfo, teamGamesOnDay, gamesToSchedule });
        totalGamesToSchedule += gamesToSchedule.length;
    });

    const scheduledGames = [];
    const effectiveMinBreak = Math.max(1, settings.minBreak);
    const maxBreak = settings.maxBreak || Infinity;

    const slotsByTime = new Map();
    for (const slot of availableSlots) {
        if (!slotsByTime.has(slot.absTime)) slotsByTime.set(slot.absTime, []);
        slotsByTime.get(slot.absTime).push(slot);
    }
    const sortedTimes = Array.from(slotsByTime.keys()).sort((a, b) => a - b);

    for (const time of sortedTimes) {
        const slotsForThisTime = slotsByTime.get(time);
        for (const slot of slotsForThisTime) {
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
                    // Check team 1 constraints
                    if (lastGame1.day !== 0 && slot.day === lastGame1.day) {
                        const breakTime1 = slot.absTime - lastGame1.endTime;
                        if (breakTime1 < effectiveMinBreak || breakTime1 > maxBreak) {
                            isEligible = false;
                        }
                    }
                    // Check team 2 constraints, only if team 1 is still eligible
                    if (isEligible && lastGame2.day !== 0 && slot.day === lastGame2.day) {
                        const breakTime2 = slot.absTime - lastGame2.endTime;
                        if (breakTime2 < effectiveMinBreak || breakTime2 > maxBreak) {
                            isEligible = false;
                        }
                    }

                    if (isEligible) {
                        candidateGames.push({ game, divisionId: state.division.id });
                    }
                }
            }
            if (candidateGames.length === 0) continue;

            candidateGames.forEach(candidate => {
                let score = 0;
                const state = divisionStates.get(candidate.divisionId);
                const { team1, team2 } = candidate.game;
                const team1TotalGames = Object.values(state.teamGamesOnDay.get(team1)).reduce((a, b) => a + b, 0);
                const team2TotalGames = Object.values(state.teamGamesOnDay.get(team2)).reduce((a, b) => a + b, 0);
                if (team1TotalGames === 0) score += 10000;
                if (team2TotalGames === 0) score += 10000;
                const team1GamesToday = state.teamGamesOnDay.get(team1)[slot.day] || 0;
                const team2GamesToday = state.teamGamesOnDay.get(team2)[slot.day] || 0;
                if (team1GamesToday === 0) score += 1000;
                if (team2GamesToday === 0) score += 1000;
                candidate.score = score;
            });

            candidateGames.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (a.divisionId !== b.divisionId) return String(a.divisionId).localeCompare(String(b.divisionId));
                return String(a.game.team1).localeCompare(String(b.game.team1));
            });

            const bestCandidate = candidateGames[0];
            const { game, divisionId } = bestCandidate;
            const state = divisionStates.get(divisionId);
            const formatTeamName = (teamId) => {
                const teamNumber = parseInt(teamId.split('-Team').pop());
                const customName = state.division.teamNames?.[teamNumber - 1];
                return customName?.trim() || `${state.division.name} - Team ${teamNumber}`;
            };
            const scheduledGame = { id: `game-${Math.random()}`, ...slot, divisionName: state.division.name, gamePhase: game.phase, team1: formatTeamName(game.team1), team2: formatTeamName(game.team2) };
            scheduledGames.push(scheduledGame);

            const newGameInfo = { endTime: slot.absTime + settings.gameDuration, day: slot.day };
            state.gamesToSchedule.splice(state.gamesToSchedule.indexOf(game), 1);
            state.teamLastGameInfo.set(game.team1, newGameInfo);
            state.teamLastGameInfo.set(game.team2, newGameInfo);
            state.teamGamesOnDay.get(game.team1)[slot.day] = (state.teamGamesOnDay.get(game.team1)[slot.day] || 0) + 1;
            state.teamGamesOnDay.get(game.team2)[slot.day] = (state.teamGamesOnDay.get(game.team2)[slot.day] || 0) + 1;
        }
        if (scheduledGames.length === totalGamesToSchedule) break;
    }
    if (scheduledGames.length !== totalGamesToSchedule) {
        return { error: `Could not schedule all Pool Play games. ${totalGamesToSchedule - scheduledGames.length} games remaining.` };
    }
    return { scheduledGames, error: null };
}

export function generateFullSchedule(tournamentState) {
    const { settings, divisions } = tournamentState;
    const poolPlayDivisions = divisions.filter(d => d.divisionType !== 'Championship' && d.divisionType !== 'Consolation');
    const consolationDivisions = divisions.filter(d => d.divisionType === 'Consolation');
    const championshipDivisions = divisions.filter(d => d.divisionType === 'Championship');
    const allSlots = createTimeSlots(settings);
    const lastDay = settings.days;
    const lastDaySlots = allSlots.filter(s => s.day === lastDay);
    let bracketGames = [];
    let earliestGameTime = Infinity;
    const championshipResult = scheduleBracketPhase(championshipDivisions, Infinity, lastDaySlots, settings);
    if (championshipResult.error) return championshipResult;
    bracketGames.push(...championshipResult.scheduledGames);
    earliestGameTime = championshipResult.earliestGameStartTime;
    const consolationResult = scheduleBracketPhase(consolationDivisions, earliestGameTime, lastDaySlots, settings);
    if (consolationResult.error) return consolationResult;
    bracketGames.push(...consolationResult.scheduledGames);
    const occupiedSlotKeys = new Set(bracketGames.map(g => `${g.day}-${g.court}-${g.time}`));
    const poolPlaySlots = allSlots.filter(s => !occupiedSlotKeys.has(`${s.day}-${s.court}-${s.time}`));
    const poolPlayResult = schedulePoolPlayPhase(poolPlayDivisions, poolPlaySlots, settings);
    if (poolPlayResult.error) return poolPlayResult;
    const allScheduledGames = [...bracketGames, ...poolPlayResult.scheduledGames];
    const totalGamesToSchedule = divisions.reduce((sum, div) => {
        if (div.numTeams < 2) return sum;
        return sum + (div.numTeams * (div.numTeams - 1) / 2);
    }, 0);
    if (allScheduledGames.length < totalGamesToSchedule) {
        return { error: `Scheduling failed. Only ${allScheduledGames.length} of ${totalGamesToSchedule} games could be placed. Try adding more time or courts.` };
    }
    allScheduledGames.sort((a, b) => a.absTime - b.absTime || a.court - b.court);
    return { error: null, games: allScheduledGames };
}