



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









// function initializeTournamentWebSocket(host, username, playerCount) {
//   const wsUrl = `wss://${host}:4443/ws/pong/`;
//   ws = new WebSocket(wsUrl);

//   ws.onopen = () => {
//       console.log('WebSocket connection established for tournament');
//       ws.send(JSON.stringify({ 
//           t: 'select_game_type', 
//           game_type: 'tournament',
//           player_count: playerCount, 
//           username: username 
//       }));
//   };

//   ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       console.log('Received tournament message:', data.type);

//       switch (data.type) {
//           case 'tournament_status':
//               updateTournamentStatus(data);
//               break;
//           case 'match_ready':
//               startMatch(data);
//               break;
//           case 'tournament_joined':
//               handleTournamentJoined(data);
//               break;
//           case 'player_assignment':
//               handlePlayerAssignment(data);
//               break;
//           case 'update':
//               countdownValue = null;
//               updateGameState(data);
//               break;
//           case 'countdown':
//               handleCountdown(data);
//               break;
//           case 'game_over':
//               handleTournamentGameOver(data);
//               break;
//           case 'round_ended':
//               handleRoundEnded(data);
//               break;
//           case 'tournament_started':
//               handleTournamentStarted(data);
//               break;
//           case 'round_started':
//               handleRoundStarted(data);
//               break;
//           case 'tournament_ended':
//               handleTournamentEnded(data);
//               break;
//           default:
//               console.error(`Unsupported data type: ${data.type}`);
//               updateLastMessage(`Received unsupported data type: ${data.type}`);
//               break;
//       }
//   };

//   ws.onerror = (error) => {
//       console.error('Tournament WebSocket error:', error);
//   };

//   ws.onclose = (event) => {
//       console.log('Tournament WebSocket closed:', event);
//       if (!gameOver) {
//           console.log('Unexpected WebSocket closure. Attempting to reconnect...');
//           setTimeout(() => initializeTournamentWebSocket(host, username, playerCount), 3000);
//       }
//   };
// }

// function handleTournamentJoined(data) {
//   console.log('Joined tournament:', data.message);
//   console.log('Tournament details:', data.tournament_details);
//   tournamentDetails = data.tournament_details;
//   updateLastMessage(`Joined tournament. ${data.tournament_details.current_players}/${data.tournament_details.player_count} players`);
//   // Update UI to show tournament details
// }

// function handlePlayerAssignment(data) {
//   console.log(data.message);
//   window.localPlayerNumber = data.player_num;
//   updateLastMessage(`Player ${data.player_num}`);
// }

// function handleCountdown(data) {
//   countdownValue = data.value;
//   draw();
// }

// function handleTournamentGameOver(data) {
//   console.log('Game over');
//   updateLastMessage(`Game over! Winner: ${data.winner}`);
//   // Update UI elements
// }

// function handleRoundEnded(data) {
//   console.log('Round ended');
//   updateLastMessage('Round ended. Moving to bracket view.');
//   navigateToBracketView(data.tournament_details);
// }

// function handleTournamentStarted(data) {
//   console.log('Tournament started:', data.message);
//   updateLastMessage('Tournament started!');
// }

// function handleRoundStarted(data) {
//   console.log('New round started:', data.round);
//   updateLastMessage(`Round ${data.round} started!`);
// }

// function handleTournamentEnded(data) {
//   console.log('Tournament ended. Winner:', data.winner);
//   updateLastMessage(`Tournament ended. Winner: ${data.winner}`);
// }

// function updateTournamentStatus(data) {
//   updateLastMessage(data.message);
//   console.log('Tournament status:', data.message);
  
//   if (data.all_players_ready) {
//       updateLastMessage('All players ready. Starting next round...');
//       // Reset game canvas or update UI here
//   }
// }

// function navigateToBracketView(tournamentDetails) {
//   sessionStorage.setItem('tournamentDetails', JSON.stringify(tournamentDetails));
//   window.history.pushState({}, '', '/bracket');
//   handleRoute('bracket');
// }

// function playerReady() {
//   if (ws) {
//       ws.send(JSON.stringify({
//           t: 'player_ready',
//           tournament_id: tournamentDetails.tournament_id
//       }));
//       document.getElementById('readyButton').disabled = true;
//   }
// }

// async function startTournament(playerCount) {
//   if (ws) {
//       stopGame();
//   }

//   try {
//       const userData = await fetchUserProfile();
//       const username = userData.username;

//       const checkCanvasInterval = setInterval(() => {
//           const canvas = document.getElementById('gameCanvas');
//           console.log('Checking for canvas element...');
//           if (canvas) {
//               clearInterval(checkCanvasInterval);
//               console.log('Canvas element found');
//               document.querySelector('.canvas').style.display = 'block';
//               ctx = canvas.getContext('2d');
              
//               const host = window.location.hostname;
//               initializeTournamentWebSocket(host, username, playerCount);
//           } else {
//               console.log('Waiting for canvas element...');
//           }
//       }, 100);
//   } catch (error) {
//       console.error('Error starting tournament:', error);
//       updateLastMessage(`Error starting tournament: ${error.message}`);
//   }
// }
// window.startTournament = startTournament;
// window.playerReady = playerReady;

