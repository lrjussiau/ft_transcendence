console.log("modal.js loaded");

let modalClosedByUser = true;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");
  setupModalTriggers();
});

function setupModalTriggers() {
  console.log("Setting up modal triggers");

  const modalTriggers = document.querySelectorAll('.modal-trigger');
  console.log(`Found ${modalTriggers.length} modal triggers`);

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modalName = trigger.getAttribute('data-modal');
      const modalHtmlPath = trigger.getAttribute('data-html');
      console.log(`Modal trigger clicked: ${modalName}, ${modalHtmlPath}`);
      showModal(modalName, modalHtmlPath);
    });
  });
}

function showModal(modalName, modalHtmlPath) {
  return new Promise((resolve, reject) => {
    console.log(`Loading modal: ${modalName}`);

    fetch(modalHtmlPath)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(html => {
        const modalContainer = document.getElementById('modal-container');

        if (modalContainer) {
          modalContainer.innerHTML = html;
          const modalElement = $(`#${modalName}`);
          modalElement.modal('show');
          console.log(`${modalName} is now shown`);

          modalElement.on('shown.bs.modal', () => {
            initializeModal(modalName);
            resolve();
          });

          modalElement.on('hidden.bs.modal', () => handleModalHidden(modalName));
        } else {
          reject(new Error('#modal-container element not found'));
        }
      })
      .catch(error => {
        console.error('Failed to load modal:', error);
        reject(error);
      });
  });
}

function hideModal(modalName) {
  return new Promise((resolve) => {
    const modalElement = $(`#${modalName}`);
    modalElement.modal('hide');
    modalElement.on('hidden.bs.modal', function () {
      $(this).off('hidden.bs.modal');
      resolve();
    });
  });
}

function handleModalHidden(modalName) {
  if (modalClosedByUser && (modalName === 'loginModal' || modalName === 'registerModal')) {
    if (!document.querySelector('.modal.show') && !localStorage.getItem('authToken')) {
      console.log(`Modal ${modalName} hidden, redirecting to home`);
      window.history.pushState({}, '', '/home');
      handleRoute('home');
    }
  }
  modalClosedByUser = true;
}

function initializeModal(modalId) {
  switch (modalId) {
    case 'avatarModal':
      setupAvatarForm();
      listAvatars();
      setupChangeAvatar();
      break;
    case 'loginModal':
      setupLoginForm();
      setupRegisterButton();
      break;
    case 'registerModal':
      setupRegisterForm();
      break;
    case 'friendModal':
      initializeFriendSearch();
      break;
    case 'usernameChangeModal':
      setupUsernameChangeModal();
      break;
    case 'emailChangeModal':
      setupEmailChangeModal();
      break;
    case 'passwordChangeModal':
      setupPasswordChangeModal();
      break;
    default:
      console.error('No setup function for modal:', modalId);
  }
}

function transitionToModal(currentModal, targetModal, targetModalPath) {
  hideModal(currentModal).then(() => {
    showModal(targetModal, targetModalPath);
  });
}

// Export functions that need to be accessed by other modules
window.showModal = showModal;
window.hideModal = hideModal;
window.transitionToModal = transitionToModal;