const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Example endpoint to send data to the blockchain
app.post('/record_score', async (req, res) => {
    const { game_id, score_loser, score_winner, loser, winner} = req.body;

    try {
        // Path to your script
        const scriptPath = path.join(__dirname, 'scripts', 'recordScore.js');
        
        // Execute the script
        exec(`node ${scriptPath} ${game_id} ${score_loser} ${score_winner} ${loser} ${winner}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${error}`);
                return res.status(500).json({ error: 'Failed to execute script' });
            }
            res.json({ message: 'Data sent successfully', output: stdout });
        });
    } catch (error) {
        console.error('Error sending data to blockchain:', error);
        res.status(500).json({ error: 'Failed to send data to blockchain' });
    }
});

// Example endpoint to get data from the blockchain
app.post('/retrieve_score', async (req, res) => {
    const { game_id } = req.body;

    try {
        // Path to your script
        const scriptPath = path.join(__dirname, 'scripts', 'retrieveScore.js');

        // Execute the script
        exec(`node ${scriptPath} ${game_id}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${error}`);
                return res.status(500).json({ error: 'Failed to execute script' });
            }
            res.json({ message: 'Data retrieved successfully', output: stdout });
        });
    } catch (error) {
        console.error('Error getting data from blockchain:', error);
        res.status(500).json({ error: 'Failed to get data from blockchain' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Blockchain API server listening at http://localhost:${port}`);
});
