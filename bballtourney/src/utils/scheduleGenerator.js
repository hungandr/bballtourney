// src/utils/scheduleGenerator.js

// --- HELPER FUNCTIONS ---

/**
 * Generates an array of all available time slots based on tournament settings.
 * @param {object} settings - The tournament settings from the context.
 * @returns {Array} An array of slot objects, e.g., [{ day: 1, time: '09:00', court: 1 }]
 */
function createTimeSlots(settings) {
    const slots = [];
    const { days, courts, startTime, endTime, gameDuration } = settings;
    const gameMinutes = parseInt(gameDuration);

    // Convert HH:MM to total minutes from midnight
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

/**
 * Generates round-robin matchups for N teams.
 * @param {number} numTeams - The number of teams in the pool.
 * @returns {Array} An array of game objects, e.g., [{ team1: 'Team 1', team2: 'Team 2' }]
 */
function generateRoundRobinGames(numTeams) {
    const games = [];
    for (let i = 1; i <= numTeams; i++) {
        for (let j = i + 1; j <= numTeams; j++) {
            games.push({ team1: `Team ${i}`, team2: `Team ${j}` });
        }
    }
    return games;
}

/**
 * Generates single elimination matchups for a list of team placeholders.
 * @param {Array<string>} teams - An array of team names or placeholders.
 * @returns {Array} An array of game objects for the playoff bracket.
 */
function generateSingleEliminationPlayoffs(teams) {
    const games = [];
    if (teams.length < 2) return games;

    // A simple first-round pairing. A more complex algorithm would handle byes.
    for (let i = 0; i < Math.floor(teams.length / 2); i++) {
        games.push({ team1: teams[i*2], team2: teams[i*2 + 1] });
    }
    // Note: This doesn't create subsequent rounds, but provides the first-round playoff games.
    return games;
}

/**
 * Adds metadata to a list of games.
 */
function addGameMetadata(games, division, subDiv, gamePhase) {
    return games.map(game => ({
        ...game,
        divisionName: division.name || 'Unnamed Division',
        subDivisionName: subDiv ? subDiv.name : 'Playoffs',
        gamePhase: gamePhase,
    }));
}


// --- MAIN EXPORTED FUNCTION ---

/**
 * Generates a full tournament schedule.
 * @param {object} tournamentState - The entire state from TournamentContext.
 * @returns {object} A schedule object with games or an error.
 */
export function generateFullSchedule(tournamentState) {
    let allGamesToSchedule = [];
    const { divisions } = tournamentState;

    divisions.forEach(division => {
        let gamesForThisDivision = [];

        switch (division.type) {
            case 'sub-division-round-robin':
                // Phase 1: Pool Play
                division.subDivisions.forEach(subDiv => {
                    const poolGames = generateRoundRobinGames(subDiv.numTeams);
                    gamesForThisDivision.push(...addGameMetadata(poolGames, division, subDiv, "Pool Play"));
                });
                // Phase 2: Playoffs
                const playoffTeams = division.subDivisions.map((subDiv, i) => `Winner of ${subDiv.name || `Pool ${String.fromCharCode(65 + i)}`}`);
                const playoffGames = generateSingleEliminationPlayoffs(playoffTeams);
                gamesForThisDivision.push(...addGameMetadata(playoffGames, division, null, "Playoffs"));
                break;

            case 'round-robin':
                division.subDivisions.forEach(subDiv => {
                    const poolGames = generateRoundRobinGames(subDiv.numTeams);
                    gamesForThisDivision.push(...addGameMetadata(poolGames, division, subDiv, "Pool Play"));
                });
                break;

            case 'single-elimination':
                const allTeamsInDivision = division.subDivisions.flatMap(
                    (subDiv, i) => Array.from({ length: subDiv.numTeams }, (_, j) => `${subDiv.name || `Pool ${String.fromCharCode(65 + i)}`} Team ${j + 1}`)
                );
                const bracketGames = generateSingleEliminationPlayoffs(allTeamsInDivision);
                gamesForThisDivision.push(...addGameMetadata(bracketGames, division, null, "Bracket"));
                break;

            default:
                break;
        }
        allGamesToSchedule.push(...gamesForThisDivision);
    });

    // --- Assign games to time slots ---
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