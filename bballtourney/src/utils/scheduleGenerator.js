// src/utils/scheduleGenerator.js

// --- Helper functions (createTimeSlots, generateRoundRobinGames, generateSingleEliminationPlayoffs, addGameMetadata) are unchanged ---
function createTimeSlots(settings) {
    const slots = [];
    const { days, courts, startTime, endTime, gameDuration } = settings;
    const gameMinutes = parseInt(gameDuration);
    const startTotalMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endTotalMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    for (let day = 1; day <= days; day++) {
        for (let court = 1; court <= courts; court++) {
            let currentTime = startTotalMinutes;
            while (currentTime <= endTotalMinutes) {
                const hours = Math.floor(currentTime / 60).toString().padStart(2, '0');
                const minutes = (currentTime % 60).toString().padStart(2, '0');
                slots.push({ day, time: `${hours}:${minutes}`, court });
                currentTime += gameMinutes;
            }
        }
    }
    return slots;
}

function generateRoundRobinGames(teams) {
    const games = [];
    if (!Array.isArray(teams)) { // If given a number, create placeholder teams
        teams = Array.from({ length: teams }, (_, i) => `Team ${i + 1}`);
    }
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            games.push({ team1: teams[i], team2: teams[j] });
        }
    }
    return games;
}

function generateSingleEliminationPlayoffs(teams) {
    const games = [];
    if (teams.length < 2) return games;
    for (let i = 0; i < Math.floor(teams.length / 2); i++) {
        games.push({ team1: teams[i * 2], team2: teams[i * 2 + 1] });
    }
    return games;
}

function addGameMetadata(games, division, subDiv, gamePhase) {
    return games.map(game => ({
        ...game,
        divisionName: division.name || 'Unnamed Division',
        subDivisionName: subDiv ? subDiv.name : 'Playoffs',
        gamePhase, // e.g., "Pool Play", "Championship", "Consolation"
    }));
}
// --- End of unchanged helpers ---


/**
 * Generates games for the "Pool Play + Playoffs & Consolation" format.
 */
function generateGroupPlayoffsFormat(division) {
    let games = [];

    // Phase 1: Generate Pool Play games for each sub-division
    division.subDivisions.forEach(subDiv => {
        const poolGames = generateRoundRobinGames(subDiv.numTeams);
        games.push(...addGameMetadata(poolGames, division, subDiv, "Pool Play"));
    });

    // Phase 2: Generate Championship Playoff games for the winners
    const winnerPlayoffTeams = division.subDivisions.map((subDiv, i) => `Winner of ${subDiv.name || `Pool ${String.fromCharCode(65 + i)}`}`);
    const championshipGames = generateSingleEliminationPlayoffs(winnerPlayoffTeams);
    games.push(...addGameMetadata(championshipGames, division, null, "Championship Playoff"));

    // Phase 3: Generate Consolation games for the losers within each pool
    division.subDivisions.forEach(subDiv => {
        if (subDiv.numTeams > 2) {
            // Create a list of placeholder "loser" teams for this pool
            const loserTeams = Array.from({ length: subDiv.numTeams - 1 }, (_, k) => `Non-winner #${k + 1} from ${subDiv.name}`);
            const consolationGames = generateRoundRobinGames(loserTeams); // Losers play their own round-robin
            games.push(...addGameMetadata(consolationGames, division, subDiv, "Consolation Round"));
        }
    });

    return games;
}


// --- MAIN EXPORTED FUNCTION ---
export function generateFullSchedule(tournamentState) {
    let allGamesToSchedule = [];
    const { divisions } = tournamentState;

    divisions.forEach(division => {
        let gamesForThisDivision = [];

        // --- UPDATED LOGIC FOR NEW TOURNAMENT TYPES ---
        switch (division.type) {
            case 'group-playoffs':
                gamesForThisDivision = generateGroupPlayoffsFormat(division);
                break;

            case 'round-robin':
            default:
                division.subDivisions.forEach(subDiv => {
                    const poolGames = generateRoundRobinGames(subDiv.numTeams);
                    gamesForThisDivision.push(...addGameMetadata(poolGames, division, subDiv, "Pool Play"));
                });
                break;
        }
        allGamesToSchedule.push(...gamesForThisDivision);
    });

    // --- Assign games to time slots (unchanged) ---
    const availableSlots = createTimeSlots(tournamentState.settings);

    if (allGamesToSchedule.length > availableSlots.length) {
        return {
            error: `Scheduling Failed: You need to schedule ${allGamesToSchedule.length} games, but there are only ${availableSlots.length} time slots available. Please increase the number of days/courts or adjust the times.`,
            games: []
        };
    }

    const scheduledGames = allGamesToSchedule.map((game, index) => {
        const slot = availableSlots[index];
        return { ...game, ...slot, id: new Date().getTime() + index };
    });

    return { error: null, games: scheduledGames };
}