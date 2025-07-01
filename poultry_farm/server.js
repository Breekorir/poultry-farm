const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise'); // Using mysql2/promise for async/await support

const app = express();
const port = 3000; // Hardcoded port

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- MySQL Database Connection Pool ---
// IMPORTANT: These credentials are hardcoded. REPLACE with your actual details.
// For production, always use environment variables!
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // <-- REPLACE with your MySQL username
    password: '', // <-- REPLACE with your MySQL password
    database: 'poultry_farm_db', // <-- REPLACE if your database name is different
    waitForConnections: true,
    connectionLimit: 10, // Max number of connections in the pool
    queueLimit: 0 // No limit for queued connection requests
});

// --- API Endpoints ---

// Serve the main HTML file (frontend entry point)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ## Dashboard Statistics
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [flocksResult] = await pool.query("SELECT COUNT(*) as totalFlocks, SUM(currentBirdCount) as totalBirds FROM flocks WHERE status = 'active'");
        const [salesResult] = await pool.query("SELECT SUM(totalPrice) as totalRevenue FROM sales WHERE saleDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
        const [eggsResult] = await pool.query("SELECT SUM(quantity) as eggsToday FROM eggs WHERE date = CURDATE()");

        res.json({
            totalFlocks: flocksResult[0].totalFlocks || 0,
            totalBirds: flocksResult[0].totalBirds || 0,
            revenueLast30Days: salesResult[0].totalRevenue || 0,
            eggsToday: eggsResult[0].eggsToday || 0
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
    }
});

// ## Flocks Management

app.get('/api/flocks', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM flocks ORDER BY id DESC");
        res.json(rows);
    } catch (error) {
        console.error("Error fetching flocks:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch flocks.' });
    }
});

app.post('/api/flocks', async (req, res) => {
    const { flockName, breed, initialBirdCount, acquisitionDate, flockStatus } = req.body;
    try {
        // currentBirdCount is initialized with initialBirdCount
        const query = `INSERT INTO flocks (name, breed, initialBirdCount, currentBirdCount, acquisitionDate, status) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [flockName, breed, parseInt(initialBirdCount), parseInt(initialBirdCount), acquisitionDate, flockStatus];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Flock added successfully!', data: { id: result.insertId, ...req.body } });
    } catch (error) {
        console.error("Error adding flock:", error);
        res.status(500).json({ success: false, message: 'Failed to add flock.' });
    }
});

// ## Feed Management
app.get('/api/feed', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM feed ORDER BY purchaseDate DESC");
        res.json(rows);
    } catch (error) {
        console.error("Error fetching feed stock:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch feed stock.' });
    }
});

app.post('/api/feed', async (req, res) => {
    const { feedType, quantityKg, purchaseDate, supplier } = req.body;
    try {
        const query = "INSERT INTO feed (type, quantityKg, purchaseDate, supplier) VALUES (?, ?, ?, ?)";
        const [result] = await pool.query(query, [feedType, parseFloat(quantityKg), purchaseDate, supplier]);
        res.status(201).json({ success: true, message: 'Feed purchase logged successfully!', data: { id: result.insertId, ...req.body } });
    } catch (error) {
        console.error("Error logging feed purchase:", error);
        res.status(500).json({ success: false, message: 'Failed to log feed purchase.' });
    }
});

// ## Egg Collection

app.get('/api/eggs', async (req, res) => {
    try {
        // Join with flocks to get flock name
        const query = `SELECT e.*, f.name as flockName FROM eggs e LEFT JOIN flocks f ON e.flockId = f.id ORDER BY e.date DESC, e.id DESC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching egg logs:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch egg logs.' });
    }
});

app.post('/api/eggs', async (req, res) => {
    const { flockId, date, quantity, gradeA, gradeB } = req.body;
    try {
        const query = "INSERT INTO eggs (flockId, date, quantity, gradeA, gradeB) VALUES (?, ?, ?, ?, ?)";
        const values = [parseInt(flockId), date, parseInt(quantity), parseInt(gradeA) || 0, parseInt(gradeB) || 0];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Egg collection logged successfully!', data: { id: result.insertId, ...req.body } });
    } catch (error) {
        console.error("Error logging eggs:", error);
        res.status(500).json({ success: false, message: 'Failed to log eggs.' });
    }
});

// ## Mortality Tracking

app.get('/api/mortality', async (req, res) => {
    try {
        // Join with flocks to get flock name
        const query = `SELECT m.*, f.name as flockName FROM mortality m LEFT JOIN flocks f ON m.flockId = f.id ORDER BY m.date DESC, m.id DESC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching mortality logs:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch mortality logs.' });
    }
});

app.post('/api/mortality', async (req, res) => {
    const { flockId, date, count, cause } = req.body;
    const connection = await pool.getConnection(); // Get a connection from the pool for transaction
    try {
        await connection.beginTransaction(); // Start a transaction

        // Insert mortality record
        const insertQuery = "INSERT INTO mortality (flockId, date, count, cause) VALUES (?, ?, ?, ?)";
        await connection.query(insertQuery, [parseInt(flockId), date, parseInt(count), cause]);

        // Update flock's current bird count
        const updateQuery = "UPDATE flocks SET currentBirdCount = currentBirdCount - ? WHERE id = ?";
        await connection.query(updateQuery, [parseInt(count), parseInt(flockId)]);

        await connection.commit(); // Commit the transaction if all operations succeed
        res.status(201).json({ success: true, message: 'Mortality recorded and flock count updated.' });
    } catch (error) {
        await connection.rollback(); // Rollback the transaction on any error
        console.error("Error recording mortality:", error);
        res.status(500).json({ success: false, message: 'Failed to record mortality.' });
    } finally {
        connection.release(); // Always release the connection back to the pool
    }
});

// ## Sales Records

app.get('/api/sales', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT *, FORMAT(totalPrice, 2) as formattedTotalPrice FROM sales ORDER BY saleDate DESC");
        res.json(rows);
    } catch (error) {
        console.error("Error fetching sales records:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch sales records.' });
    }
});

app.post('/api/sales', async (req, res) => {
    const { item, quantity, unitPrice, saleDate, customer } = req.body;
    try {
        const totalPrice = parseFloat(quantity) * parseFloat(unitPrice);
        const query = "INSERT INTO sales (item, quantity, unitPrice, totalPrice, saleDate, customer) VALUES (?, ?, ?, ?, ?, ?)";
        const values = [item, parseFloat(quantity), parseFloat(unitPrice), totalPrice, saleDate, customer];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Sale recorded successfully!', data: { id: result.insertId, ...req.body, totalPrice } });
    } catch (error) {
        console.error("Error recording sale:", error);
        res.status(500).json({ success: false, message: 'Failed to record sale.' });
    }
});

// ## Vaccinations
app.get('/api/vaccinations', async (req, res) => {
    try {
        // Join with flocks to get flock name
        const query = `SELECT v.*, f.name as flockName FROM vaccinations v LEFT JOIN flocks f ON v.flockId = f.id ORDER BY v.vaccinationDate DESC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching vaccination records:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch vaccination records.' });
    }
});

app.post('/api/vaccinations', async (req, res) => {
    const { flockId, vaccineName, method, vaccinationDate, notes } = req.body;
    try {
        const query = "INSERT INTO vaccinations (flockId, vaccineName, method, vaccinationDate, notes) VALUES (?, ?, ?, ?, ?)";
        const values = [parseInt(flockId), vaccineName, method, vaccinationDate, notes];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Vaccination record added!', data: { id: result.insertId, ...req.body } });
    } catch (error) {
        console.error("Error adding vaccination record:", error);
        res.status(500).json({ success: false, message: 'Failed to add vaccination record.' });
    }
});

// ## Server Initialization

// Test database connection and start the server
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database.');
        connection.release(); // Release the test connection immediately
        app.listen(port, () => {
            console.log(`Poultry Farm server running on http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('--- DATABASE CONNECTION FAILED ---');
        console.error('Please check your hardcoded database credentials in server.js');
        console.error(`MySQL error: ${error.message}`);
        process.exit(1); // Exit the application if database connection fails
    });