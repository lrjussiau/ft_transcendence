async function launchGame() {
  initializeGameButtons();
}

function initializeGameButtons() {
  const startButton = document.getElementById('startButton');
  const gameButtons = {
    'solo': document.getElementById('solo'),
    '1v1': document.getElementById('1v1'),
    'local_1v1': document.getElementById('local_1v1'),
    'tournament-4': document.getElementById('tournament-4'),
  };

  let selectedGameType = null;

  // Add click event listeners to game type buttons
  for (const [type, button] of Object.entries(gameButtons)) {
    if (button) {
      button.addEventListener('click', () => {
        selectedGameType = type;
        highlightSelectedButton(button, gameButtons);
        console.log(`Game type selected: ${selectedGameType}`);
      });
    } else {
      console.error(`#${type} button element not found`);
    }
  }

  if (startButton) {
    startButton.addEventListener('click', async () => {
      if (selectedGameType) {
        window.history.pushState({}, '', '/canvas');
        handleRoute('canvas');
        await attributePlayer(selectedGameType); // Update player info when game starts
        if (selectedGameType === 'tournament-4') {
          startTournament(4);
        } else {
          startGame(selectedGameType);
        }
      } else {
        alert('Please select a game type first.');
      }
    });
  } else {
    console.error('#startButton element not found');
  }
}

function highlightSelectedButton(selectedButton, allButtons) {
  // Remove highlight from all buttons
  Object.values(allButtons).forEach(button => {
    if (button) button.classList.remove('btn-selected');
  });
  // Add highlight to selected button
  selectedButton.classList.add('btn-selected');
}


async function attributePlayer(gameType) {
  try {
      const userProfile = await fetchUsernameAvatar('currentUserId'); // Remplacez 'currentUserId' par l'ID réel de l'utilisateur actuel
      
      // Update Player 1 (always the current user)
      const player1Img = document.getElementById('player-1-img');
      const player1Name = document.getElementById('player-1-name').querySelector('h5');

      if (userProfile.avatar) {
          player1Img.src = userProfile.avatar;
      } else {
          player1Img.src = '/static/img/default_avatar.png'; // Fallback to default avatar
      }
      player1Img.alt = `${userProfile.username}'s avatar`;
      player1Name.textContent = userProfile.username;

      // Update Player 2 based on game type
      const player2Img = document.getElementById('player-2-img');
      const player2Name = document.getElementById('player-2-name').querySelector('h5');

      if (gameType === 'local_1v1') {
          player2Img.src = '/media/avatars/default_avatar.png';
          player2Img.alt = 'Player 2 avatar';
          player2Name.textContent = 'Player 2';
      } else if (gameType === 'ai') {
          player2Img.src = '/media/avatars/default_avatar.png'; // Assuming you have an AI avatar
          player2Img.alt = 'AI avatar';
          player2Name.textContent = 'AI Opponent';
      } else if (gameType === '1v1') {
          player2Img.src = '/media/avatars/default_avatar.png';
          player2Img.alt = 'Waiting for opponent';
          player2Name.textContent = 'Waiting...';
      }

      console.log('Player cards updated successfully');
  } catch (error) {
      console.error('Error updating player cards:', error);
  }
}

async function fetchUsernameAvatar(user_id) {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/authentication/user/profile/${user_id}/`, {
      headers: {
          'Authorization': `Bearer ${token}`
      }
  });

  if (response.ok) {
      return response.json();
  } else {
      throw new Error('Failed to fetch user profile');
  }
}


function loadBracketView() {
const mainContent = document.getElementById('main-content');
fetch('/bracket.html')
    .then(response => response.text())
    .then(html => {
        mainContent.innerHTML = html;
        displayBracket();
    });
}

function displayBracket() {
const tournamentDetails = JSON.parse(sessionStorage.getItem('tournamentDetails'));
const bracketView = document.getElementById('bracketView');

// Create a simple bracket display
let bracketHTML = '<ul>';
tournamentDetails.players.forEach((player, index) => {
    bracketHTML += `<li>${player} ${tournamentDetails.winners.includes(player) ? '(Winner)' : ''}</li>`;
    if (index % 2 !== 0) bracketHTML += '<br>';
});
bracketHTML += '</ul>';

bracketView.innerHTML = bracketHTML;
}