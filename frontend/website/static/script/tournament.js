async function startTournament(playerCount) {
    // First, ensure any existing game is stopped
    if (ws) {
      stopGame();
    }
  
    try {
      const userData = await fetchUserProfile();
      const username = userData.username;
  
      // Wait for the canvas element to be available
      const checkCanvasInterval = setInterval(() => {
        const canvas = document.getElementById('gameCanvas');
        console.log('Checking for canvas element...');
        if (canvas) {
          clearInterval(checkCanvasInterval);
          
          console.log('Canvas element found');
          document.querySelector('.canvas').style.display = 'block';
          
          ctx = canvas.getContext('2d');
          
          const host = window.location.hostname;
          const wsUrl = `wss://${host}:4443/ws/pong/`;
  
          ws = new WebSocket(wsUrl);
          ws.onopen = () => {
            console.log('WebSocket connection established');
            // Change this line to use 'select_game_type' instead of 'sg'
            ws.send(JSON.stringify({ 
              t: 'select_game_type', 
              game_type: 'tournament',
              player_count: playerCount, 
              username: username 
            }));
          };
  
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message:', data.type);
  
            switch (data.type) {
              case 'tournament_status':
                updateTournamentStatus(data);
                break;
              case 'match_ready':
                startMatch(data);
                break;
              case 'tournament_joined':
                console.log('Joined tournament:', data.message);
                console.log('Tournament details:', data.tournament_details);
                updateLastMessage(`Joined tournament. ${data.tournament_details.current_players}/${data.tournament_details.player_count} players`);
                // You might want to update the UI to show the tournament details
                break;
              case 'player_assignment':
                console.log(data.message);
                window.localPlayerNumber = data.player_num;
                updateLastMessage(`Player ${data.player_num}`);
                break;
              case 'update':
                countdownValue = null;
                updateGameState(data);
                break;
              case 'countdown':
                countdownValue = data.value;
                draw();
                break;
              case 'game_over':
                  console.log('Game over');
                  updateLastMessage('Game over!');
                  handleTournamentGameOver(data);
                  break;
              case 'round_ended':
                  console.log('Round ended');
                  updateLastMessage('Round ended. Moving to bracket view.');
                  navigateToBracketView(data.tournament_details);
                  break;
              case 'tournament_started':
                console.log('Tournament started:', data.message);
                updateLastMessage('Tournament started!');
                break;
              case 'round_started':
                console.log('New round started:', data.round);
                updateLastMessage(`Round ${data.round} started!`);
                break;
              case 'tournament_ended':
                console.log('Tournament ended. Winner:', data.winner);
                updateLastMessage(`Tournament ended. Winner: ${data.winner}`);
                break;
              default:
                console.error(`Unsupported data type: ${data.type}`);
                updateLastMessage(`Received unsupported data type: ${data.type}`);
                break;
            }
          };
  
          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
          };
  
          ws.onclose = (event) => {
            console.log('WebSocket closed:', event);
            if (!gameOver) {
              console.log('Unexpected WebSocket closure. Attempting to reconnect...');
              setTimeout(() => startTournament(playerCount), 3000);  // Try to reconnect after 3 seconds
            }
          };
        } else {
          console.log('Waiting for canvas element...');
        }
      }, 100); // Check every 100ms
    } catch (error) {
      console.error('Error starting tournament:', error);
      updateLastMessage(`Error starting tournament: ${error.message}`);
    }
  }
  
function updateTournamentStatus(data) {
  // Update the UI with tournament status (e.g., waiting for players, bracket updates)
  updateLastMessage(data.message);
  console.log('Tournament status:', data.message);
  // You might want to update a tournament bracket visualization here
}
  
function handleTournamentGameOver(data) {
    updateLastMessage(`Game over! Winner: ${data.winner}`);
    // You might want to update some UI elements here
}

function navigateToBracketView(tournamentDetails) {
    // Store tournament details in sessionStorage
    sessionStorage.setItem('tournamentDetails', JSON.stringify(tournamentDetails));
    
    // Navigate to the bracket view
    window.history.pushState({}, '', '/bracket');
    handleRoute('bracket');
}

function playerReady() {
    if (ws) {
        ws.send(JSON.stringify({
            t: 'player_ready',
            tournament_id: JSON.parse(sessionStorage.getItem('tournamentDetails')).tournament_id
        }));
        document.getElementById('readyButton').disabled = true;
    }
}

// Add this function to your existing updateTournamentStatus function
function updateTournamentStatus(data) {
    updateLastMessage(data.message);
    console.log('Tournament status:', data.message);
    
    if (data.all_players_ready) {
        updateLastMessage('All players ready. Starting next round...');
        // You might want to reset the game canvas or update UI here
    }
}