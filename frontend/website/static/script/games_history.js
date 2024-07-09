async function fetchUserStats(userId) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/games_history/user_stats/${userId}/`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
    });
    if (!response.ok) {
        throw new Error('Failed to fetch user stats');
    }
    return response.json();
}

async function fetchGames(userId) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/games_history/retrieve_data/${userId}/`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

    if (response.status == 200) {
        return response.json();
    } else {
        throw new Error('Failed to fetch games');
    }
}

async function defineStats() {
    const user = await fetchUserProfile();
    
    // Fetch the counts from the server
    const stats = await fetchUserStats(user.id);
    
    let num_wins = stats.wins;
    let num_losses = stats.losses;
    
    let win_loss_ratio;
    if (num_losses > 0) {
        win_loss_ratio = (num_wins / num_losses).toFixed(2);
    } else {
        win_loss_ratio = num_wins.toFixed(2);
    }
    
    document.getElementById('wins').textContent = num_wins;
    document.getElementById('loses').textContent = num_losses;
    document.getElementById('ratio').textContent = win_loss_ratio;
}

async function gameHistory() {
    const user = await fetchUserProfile(); // You need to implement this function to get the current user's ID
    const gameTableBody = document.getElementById('gameTableBody');
    
    try {
        const response = await fetchGames(user.id);
        //console.error('Games: ', response);
        if (!response.status === 200) {
            //console.log('Games: ', response.status);
            throw new Error('Failed to fetch games');
        }
        //const games = data.matches;

        gameTableBody.innerHTML = ''; // Clear existing rows

        response.forEach(game => {
            const row = document.createElement('tr');
            //console.log('Games: ', game.winner.username);
            const isWinner = game.winner.id === user.id ? true:false;
            const opponent = isWinner ? game.loser : game.winner;
            const is_tournament = game.is_tournament_game;
            const score_loser = game.loser_score;
            const score_winner = 5;

            row.innerHTML = `
            <td class="opponent">
                <div class="opponent-card">
                    <img src="${opponent.avatar}" alt="player-img" class="img-fluid">
                    <div class="opponent-name">${opponent.username}</div>
                </div>
            </td>
            <td class="result" data-i18n="${isWinner ? 'winner' : 'loser'}"></td>
            <td class="score_game">${score_loser} - ${score_winner}</td>
            <td class="is_tournament" data-i18n=${is_tournament ? 'isTournament':'isNotTournament'}></td>
            <td class="data">${formatDate(game.match_date)}</td>
        `;
            gameTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching games:', error);
        gameTableBody.innerHTML = '<tr><td colspan="3">Failed to load games.</td></tr>';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
    const formattedTime = date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    return `${formattedDate} ${formattedTime}`;
}
