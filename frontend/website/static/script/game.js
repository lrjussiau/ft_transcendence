async function launchGame() {
    initializeGameButtons();
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
      if (button) button.classList.remove('btn-success');
    });
    // Add highlight to selected button
    selectedButton.classList.add('btn-success');
  }
