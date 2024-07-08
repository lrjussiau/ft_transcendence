async function launchGame() {
  initializeGameButtons();
}

async function fetchOpponentAvatar(username) {
  try {
    const response = await fetch(`/user/avatar/${username}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming you use token-based auth
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.avatar;
    } else {
      console.error('Failed to fetch opponent avatar:', response.statusText);
      return '/media/avatars/default_avatar.png'; // Fallback avatar
    }
  } catch (error) {
    console.error('Error fetching opponent avatar:', error);
    return '/media/avatars/default_avatar.png'; // Fallback avatar
  }
}

function initializeGameButtons() {
  const startButton = document.getElementById('startButton');
  const gameButtons = {
    'solo': document.getElementById('solo'),
    '1v1': document.getElementById('1v1'),
    'local_1v1': document.getElementById('local_1v1'),
    'tournament': document.getElementById('tournament')
  };

  let selectedGameType = null;

  // Add click event listeners to game type buttons
  for (const [type, button] of Object.entries(gameButtons)) {
    if (button) {
      button.addEventListener('click', async () => {
        selectedGameType = type;
        highlightSelectedButton(button, gameButtons);
        //console.log(`Game type selected: ${selectedGameType}`);

        // Call attributePlayer when game type is selected
        await attributePlayer(selectedGameType);
      });
    } else {
      console.error(`#${type} button element not found`);
    }
  }

  if (startButton) {
    startButton.addEventListener('click', () => {
      if (selectedGameType) {
        window.history.pushState({}, '', '/canvas');
        handleRoute('canvas');
        startGame(selectedGameType);
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
    const userProfile = await fetchUserProfile();

    // Update Player 1 (always the current user)
    const player1Img = document.getElementById('player-1-img');
    const player1Name = document.getElementById('player-1-name').querySelector('h5');

    if (userProfile.avatar) {
      player1Img.src = userProfile.avatar;
    } else {
      player1Img.src = '/media/avatars/default_avatar.png'; // Fallback to default avatar
    }
    player1Img.alt = `${userProfile.username}'s avatar`;
    player1Name.textContent = userProfile.username;

    // Update Player 2 based on game type
    const player2Img = document.getElementById('player-2-img');
    const player2Name = document.getElementById('player-2-name').querySelector('h5');

    if (gameType === 'local_1v1') {
      player2Img.src = player1Img.src; // Use Player 1 avatar for Player 2
      player2Img.alt = 'Player 2 avatar';
      player2Name.textContent = 'Player 2';
    } else if (gameType === 'solo') {
      player2Img.src = '/media/avatars/ai.png'; // Assuming you have an AI avatar
      player2Img.alt = 'AI avatar';
      player2Name.textContent = 'AI Opponent';
    } else if (gameType === '1v1') {
      // Fetch opponent avatar
      const opponentUsername = 'opponentUsername'; // Replace with actual opponent username
      const opponentAvatar = await fetchOpponentAvatar(opponentUsername);
      player2Img.src = opponentAvatar;
      player2Img.alt = `${opponentUsername}'s avatar`;
      player2Name.textContent = opponentUsername;
    }

    //console.log('Player cards updated successfully');
  } catch (error) {
    console.error('Error updating player cards:', error);
  }
}
