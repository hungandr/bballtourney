// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
// Allow requests from your frontend's deployed URL
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for big schedules

// --- Database Connection ---
// Ensure you have DATABASE_URL in your .env file or Render environment variables
if (!process.env.DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL is not defined.");
    process.exit(1);
}
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schema (The structure of your data in the DB) ---
const tournamentSchema = new mongoose.Schema({
    settings: Object,
    divisions: Array,
    schedule: Object,
    createdAt: { type: Date, default: Date.now }
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

// --- API Routes ---

// GET a specific tournament by its ID
app.get('/api/tournaments/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.json(tournament);
    } catch (error) {
        // Handle cases where the ID format is invalid
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Tournament not found (invalid ID format)' });
        }
        console.error('Error fetching tournament:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST a new tournament to save it
app.post('/api/tournaments', async (req, res) => {
    try {
        // The request body will contain the full state: { settings, divisions, schedule }
        const tournamentData = req.body;
        if (!tournamentData.settings || !tournamentData.divisions || !tournamentData.schedule) {
            return res.status(400).json({ message: 'Invalid tournament data provided.' });
        }
        const newTournament = new Tournament(tournamentData);
        await newTournament.save();

        // Respond with the newly created tournament, including its unique _id
        res.status(201).json(newTournament);
    } catch (error) {
        console.error('Error saving tournament:', error);
        res.status(500).json({ message: 'Server error saving tournament' });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});