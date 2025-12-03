const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'embeddings.json');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for potential large data
app.use(express.static(path.join(__dirname, 'public')));

// Helper to load users
function loadUsers() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading embeddings file:', err);
        return [];
    }
}

// Helper to save users
function saveUsers(users) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// Helper to calculate Euclidean distance
function getEuclideanDistance(d1, d2) {
    if (d1.length !== d2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < d1.length; i++) {
        sum += Math.pow(d1[i] - d2[i], 2);
    }
    return Math.sqrt(sum);
}

// Routes
app.post('/api/register', (req, res) => {
    const { name, descriptor } = req.body;
    if (!name || !descriptor || !Array.isArray(descriptor)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    const users = loadUsers();

    // Check if user already exists
    const existingIndex = users.findIndex(u => u.name === name);
    if (existingIndex !== -1) {
        // Update existing user
        users[existingIndex].descriptor = descriptor;
        console.log(`User updated: ${name}`);
    } else {
        // Add new user
        users.push({ name, descriptor });
        console.log(`User registered: ${name}`);
    }

    saveUsers(users);
    res.json({ success: true, message: 'User registered successfully' });
});

app.post('/api/verify', (req, res) => {
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    const users = loadUsers();
    let bestMatch = null;
    let minDistance = Infinity;
    const THRESHOLD = 0.5; // Tolerance < 0.6 per workflow

    for (const user of users) {
        const distance = getEuclideanDistance(user.descriptor, descriptor);
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = user;
        }
    }

    if (bestMatch && minDistance < THRESHOLD) {
        console.log(`User verified: ${bestMatch.name} (Distance: ${minDistance.toFixed(4)})`);
        res.json({
            success: true,
            message: 'Authentication successful',
            user: { name: bestMatch.name },
            token: 'mock-secure-token-' + Date.now()
        });
    } else {
        console.log(`Verification failed. Best distance: ${minDistance.toFixed(4)}`);
        res.json({ success: false, message: 'Face Mismatch' });
    }
});

app.get('/api/users', (req, res) => {
    const users = loadUsers();
    res.json(users.map(u => ({ name: u.name })));
});

app.delete('/api/delete/:name', (req, res) => {
    try {
        const nameToDelete = req.params.name;
        console.log(`Delete request for: ${nameToDelete}`);

        let users = loadUsers();
        if (!Array.isArray(users)) {
            console.error('Users data is not an array, resetting.');
            users = [];
        }

        const initialLength = users.length;
        users = users.filter(u => u.name !== nameToDelete);

        if (users.length < initialLength) {
            saveUsers(users);
            console.log(`User deleted: ${nameToDelete}`);
            res.json({ success: true, message: `User ${nameToDelete} deleted successfully` });
        } else {
            console.log(`User not found: ${nameToDelete}`);
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (err) {
        console.error('Server error during delete:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
