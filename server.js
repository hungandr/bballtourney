require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- Database Connection ---
if (!process.env.DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL is not defined.");
    process.exit(1);
}
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schema ---
const tournamentSchema = new mongoose.Schema({
    settings: Object,
    divisions: Array,
    schedule: Object,
    createdAt: { type: Date, default: Date.now }
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

// --- API ROUTES ---
// All your API routes must come before the React app serving block.

app.get('/api/tournaments/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        res.json(tournament);
    } catch (error) {
        if (error.kind === 'ObjectId') return res.status(404).json({ message: 'Tournament not found' });
        console.error('Error fetching tournament:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/tournaments', async (req, res) => {
    try {
        const tournamentData = req.body;
        if (!tournamentData.settings || !tournamentData.divisions || !tournamentData.schedule) {
            return res.status(400).json({ message: 'Invalid tournament data provided.' });
        }
        const newTournament = new Tournament(tournamentData);
        await newTournament.save();
        res.status(201).json(newTournament);
    } catch (error) {
        console.error('Error saving tournament:', error);
        res.status(500).json({ message: 'Server error saving tournament' });
    }
});

// --- SERVE REACT APP ---
// This serves the static files from the built React app
app.use(express.static(path.join(__dirname, 'build')));

// This "catchall" handler serves the main index.html file for any
// request that doesn't match an API route. This allows React Router to work.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});