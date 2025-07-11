require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

if (!process.env.DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL is not defined.");
    process.exit(1);
}
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

const tournamentSchema = new mongoose.Schema({
    settings: Object,
    divisions: Array,
    schedule: Object,
    createdAt: { type: Date, default: Date.now }
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

// GET all saved tournaments (only ID and creation date)
app.get('/api/tournaments', async (req, res) => {
    try {
        const tournaments = await Tournament.find({})
            .select('_id createdAt')
            .sort({ createdAt: -1 });
        res.json(tournaments);
    } catch (error) {
        console.error('Error fetching all tournaments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET the most recently created tournament
app.get('/api/tournaments/latest', async (req, res) => {
    try {
        const latestTournament = await Tournament.findOne().sort({ createdAt: -1 });
        if (!latestTournament) {
            return res.status(404).json({ message: 'No schedules found.' });
        }
        res.json(latestTournament);
    } catch (error) {
        console.error('Error fetching latest tournament:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET a specific tournament by its ID
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

// POST a new tournament to save it
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

// --- THIS IS THE NEW DELETE ROUTE ---
app.delete('/api/tournaments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTournament = await Tournament.findByIdAndDelete(id);

        if (!deletedTournament) {
            return res.status(404).json({ message: 'Tournament not found.' });
        }

        res.status(200).json({ message: 'Tournament deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tournament:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});