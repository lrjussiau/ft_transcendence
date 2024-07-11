function tournamenIntegrity(){

    const checkIntegrityBtn = document.getElementById('checkIntegrityBtn');
    
    if (checkIntegrityBtn) {
      checkIntegrityBtn.addEventListener('click', async () => {
        checkTournamentScoreIntegrity();
      });
    }
}

function updateIntegrityModalContent(data) {
    const modalContent = document.querySelector('#integrityModal .modal-content');
    if (modalContent) {
        modalContent.innerHTML = generateIntegrityHTML(data);
    }
    if (window.initI18next && window.updateContent) {
        window.initI18next().then(() => {
          window.updateContent();
          if (window.initializeLanguageSelector) {
            window.initializeLanguageSelector();
          }
        });
    } else {
    console.warn('i18next setup functions not found. Make sure i18n-setup.js is loaded.');
    }
}

function generateIntegrityHTML(data) {
    return `
       <h5>${i18next.t('tournamentScoreIntegrityCheck')}</h5>
        <p>${i18next.t('status')}: ${i18next.t(data.status)}</p>
        <p>${i18next.t('checkTime')}: ${formatDate(data.check_time)}</p>
        <p>${i18next.t('message')}: ${i18next.t(data.message)}</p>

    `;
}

async function checkTournamentScoreIntegrity() {
    console.log("enter integrity");
    try {
        const user = await fetchUserProfile();
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/blockchain/integrity-check/${user.id}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to check integrity');
        }

        const data = await response.json();
        console.log("data", data);
        updateIntegrityModalContent(data);
    } catch (error) {
        console.error('Error checking tournament score integrity:', error);
        updateIntegrityModalContent({ status: 'Error', message: error.message });
    }
}

