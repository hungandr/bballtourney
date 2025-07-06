// src/utils/scheduleGenerator.js

// --- Helper Functions ---
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


// --- Main Scheduling Function (Definitive, Constraint-Driven, Priority-Scoring Algorithm) ---

export function generateFullSchedule(tournamentState) {
    const { settings, divisions } = tournamentState;

    // --- 1. SETUP PER-DIVISION STATE TRACKING ---
    const divisionStates = new Map();
    let totalGamesToSchedule = 0;
    const allTeamIds = new Set();

    divisions.forEach(division => {
        const teamLastGameEndTime = new Map();
        const teamRemainingGames = new Map();
        const teamGamesOnDay = new Map();
        let gamesToSchedule = [];

        const createTeamId = (teamIndex) => `${division.id}-Team${teamIndex + 1}`;
        const teamIds = Array.from({ length: division.numTeams }, (_, i) => {
            const teamId = createTeamId(i);
            teamLastGameEndTime.set(teamId, 0);
            teamRemainingGames.set(teamId, division.numTeams - 1);
            teamGamesOnDay.set(teamId, {});
            allTeamIds.add(teamId);
            return teamId;
        });

        gamesToSchedule.push(...generateRoundRobinGames(teamIds).map(g => ({...g, division, phase: division.gameType})));

        divisionStates.set(division.id, {
            division, teamLastGameEndTime, teamRemainingGames, teamGamesOnDay, gamesToSchedule
        });
        totalGamesToSchedule += gamesToSchedule.length;
    });

    // --- 2. SETUP GLOBAL SCHEDULING STATE ---
    const availableSlots = createTimeSlots(settings);
    const scheduledGames = [];

    if (totalGamesToSchedule > availableSlots.length) {
        return { error: `Scheduling Impossible: You need ${totalGamesToSchedule} slots, but only ${availableSlots.length} are available.`, games: [] };
    }

    const effectiveMinBreak = Math.max(1, settings.minBreak);
    const numDaysInTournament = settings.dayTimes.length;

    // --- 3. THE DEFINITIVE SCHEDULING LOOP ---
    for (const slot of availableSlots) {
        if (scheduledGames.length === totalGamesToSchedule) break;

        let candidateGames = [];

        // A. Gather all possible valid games for this slot from all divisions
        for (const [divisionId, state] of divisionStates.entries()) {
            if (state.gamesToSchedule.length > 0) {
                for (const game of state.gamesToSchedule) {
                    const team1 = game.team1;
                    const team2 = game.team2;

                    // --- HARD CONSTRAINTS ---
                    if (state.division.gameType === 'Pool Play') {
                        const team1GamesToday = state.teamGamesOnDay[team1]?.[slot.day] || 0;
                        const team2GamesToday = state.teamGamesOnDay[team2]?.[slot.day] || 0;
                        if (team1GamesToday >= 2 || team2GamesToday >= 2) continue;
                    }

                    const lastGameEnd1 = state.teamLastGameEndTime.get(team1);
                    const lastGameEnd2 = state.teamLastGameEndTime.get(team2);
                    if (slot.absTime >= lastGameEnd1 + effectiveMinBreak && slot.absTime >= lastGameEnd2 + effectiveMinBreak) {
                        candidateGames.push({ game, divisionId });
                    }
                }
            }
        }

        if (candidateGames.length === 0) continue;

        // B. Choose the "best" candidate using priority scoring
        candidateGames.forEach(candidate => {
            let score = 0;
            const state = divisionStates.get(candidate.divisionId);
            const team1 = candidate.game.team1;
            const team2 = candidate.game.team2;

            if (state.division.gameType === 'Pool Play' && slot.day === 1) {
                const team1TotalGames = Object.values(state.teamGamesOnDay[team1] || {}).reduce((a, b) => a + b, 0);
                const team2TotalGames = Object.values(state.teamGamesOnDay[team2] || {}).reduce((a, b) => a + b, 0);

                if (team1TotalGames === 0) score += 10000;
                if (team2TotalGames === 0) score += 10000;
            }

            const urgency = state.teamRemainingGames.get(team1) + state.teamRemainingGames.get(team2);
            score += urgency;

            candidate.score = score;
        });

        candidateGames.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return Math.random() - 0.5;
        });

        const bestCandidate = candidateGames[0];
        const { game, divisionId } = bestCandidate;
        const state = divisionStates.get(divisionId);

        // C. Schedule the chosen game
        const formatTeamName = (teamId) => {
            // --- CORRECTED PARSING LOGIC ---
            const teamNumberStr = teamId.split('-Team').pop();
            const teamNumber = parseInt(teamNumberStr);
            const teamIndex = teamNumber - 1;

            const customName = state.division.teamNames?.[teamIndex];
            if (customName && customName.trim() !== '') return customName;

            const divisionName = state.division.name || `Division ${state.division.id}`;
            return `${divisionName} - Team ${teamNumber}`;
        };

        const scheduledGame = {
            id: `game-${Date.now() + scheduledGames.length}`, ...slot,
            divisionName: state.division.name,
            gamePhase: game.phase,
            team1: formatTeamName(game.team1),
            team2: formatTeamName(game.team2),
            team1Id: game.team1,
            team2Id: game.team2
        };
        scheduledGames.push(scheduledGame);

        // D. Remove the game and update trackers
        state.gamesToSchedule = state.gamesToSchedule.filter(g => g !== game);
        const slotEndTime = slot.absTime + settings.gameDuration;
        state.teamLastGameEndTime.set(game.team1, slotEndTime);
        state.teamLastGameEndTime.set(game.team2, slotEndTime);
        state.teamRemainingGames.set(game.team1, state.teamRemainingGames.get(game.team1) - 1);
        state.teamRemainingGames.set(game.team2, state.teamRemainingGames.get(game.team2) - 1);
        if (!state.teamGamesOnDay[game.team1]) state.teamGamesOnDay[game.team1] = {};
        if (!state.teamGamesOnDay[game.team2]) state.teamGamesOnDay[game.team2] = {};
        state.teamGamesOnDay[game.team1][slot.day] = (state.teamGamesOnDay[game.team1][slot.day] || 0) + 1;
        state.teamGamesOnDay[game.team2][slot.day] = (state.teamGamesOnDay[game.team2][slot.day] || 0) + 1;
    }

    // --- 4. FINAL VALIDATION ---
    let remainingGamesCount = 0;
    for (const state of divisionStates.values()) {
        remainingGamesCount += state.gamesToSchedule.length;
    }
    if (remainingGamesCount > 0) {
        return { error: `Scheduling Failed: Could not schedule the last ${remainingGamesCount} games. The schedule is too constrained.`, games: scheduledGames };
    }

    // Post-generation validation for the game-per-day rule
    if (numDaysInTournament > 1) {
        const finalTeamDaysPlayed = new Map();
        allTeamIds.forEach(id => finalTeamDaysPlayed.set(id, new Set()));

        scheduledGames.forEach(game => {
            if (game.team1Id && finalTeamDaysPlayed.has(game.team1Id)) finalTeamDaysPlayed.get(game.team1Id).add(game.day);
            if (game.team2Id && finalTeamDaysPlayed.has(game.team2Id)) finalTeamDaysPlayed.get(game.team2Id).add(game.day);
        });

        for (const [teamId, daysPlayed] of finalTeamDaysPlayed.entries()) {
            let divisionName = "Unknown Division";
            let divisionType = "Unknown";
            for (const state of divisionStates.values()) {
                if (teamId.startsWith(String(state.division.id))) {
                    divisionName = state.division.name;
                    divisionType = state.division.gameType;
                    break;
                }
            }
            if (divisionType === 'Pool Play' && !daysPlayed.has(1)) {
                const teamName = `Team ${teamId.split('-').pop()}`;
                return { error: `CRITICAL LOGIC ERROR: Team "${teamName}" in Pool Play division "${divisionName}" was not scheduled on Day 1. Please report this bug.`, games: scheduledGames };
            }
        }
    }

    return { error: null, games: scheduledGames };
}