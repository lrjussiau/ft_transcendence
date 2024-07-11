const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/record_score', async (req, res) => {
    const { game_id, score_loser, loser, winner} = req.body;

    try {
        const scriptPath = path.join(__dirname, 'scripts', 'recordScore.js');
        
        exec(`node ${scriptPath} ${game_id} ${score_loser} ${loser} ${winner}`, (error, stdout, stderr) => {
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

app.post('/retrieve_score', async (req, res) => {
    const { game_id } = req.body;

    try {
        const scriptPath = path.join(__dirname, 'scripts', 'retrieveScore.js');

        exec(`node ${scriptPath} ${game_id}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${error}`);
                return res.status(500).json({ error: 'Failed to execute script' });
            }
            try {
                // Find the last line that starts with "Decoded score:"
                const lines = stdout.split('\n');
                const jsonLine = lines.reverse().find(line => line.startsWith("Decoded score:"));
                if (!jsonLine) {
                    throw new Error("Couldn't find decoded score in output");
                }
                const jsonStr = jsonLine.replace("Decoded score:", "").trim();
                const data = JSON.parse(jsonStr);
                const response = { status_code: 200, ...data };
                console.log("Sending response to Django:", response);  // Log the response
                res.json(response);
            } catch (parseError) {
                console.error('Error parsing script output:', parseError);
                res.status(500).json({ error: 'Failed to parse script output' });
            }
        });
    } catch (error) {
        console.error('Error getting data from blockchain:', error);
        res.status(500).json({ error: 'Failed to get data from blockchain' });
    }
});
//to change?
app.listen(port, () => {
    console.log(`Blockchain API server listening at http://localhost:${port}`);
});
