console.log("modal.js loaded");

let modalClosedByUser = true;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");
  setupModalTriggers();
  setupModalListeners();
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

function setupModalListeners() {
  console.log('Listening for modal events');

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('shown.bs.modal', function(event) {
      const modalId = event.target.id;
      console.log('Modal shown:', modalId);
      initializeModal(modalId);
    });
  });
}

function showModal(modalName, modalHtmlPath) {
  return new Promise((resolve, reject) => {
    console.log(`Loading modal: ${modalName}`);

    // Remove any existing modal content
    const existingModal = document.getElementById(modalName);
    if (existingModal) {
      existingModal.remove();
    }

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

          modalElement.on('hidden.bs.modal', () => handleModalHidden(modalName));

          initializeModal(modalName);
          resolve();
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
    modalClosedByUser = false; // Set flag to indicate modal is being closed programmatically
    const modalElement = $(`#${modalName}`);
    modalElement.modal('hide');
    modalElement.on('hidden.bs.modal', () => {
      document.getElementById('modal-container').innerHTML = ''; // Clear the modal content
      resolve();
    });
  });
}

function handleModalHidden(modalName) {
  if (modalClosedByUser && (modalName === 'loginModal' || modalName === 'registerModal')) {
    console.log(`Modal ${modalName} hidden, redirecting to home`);
    window.history.pushState({}, '', '/home');
    handleRoute('home');
  }
  modalClosedByUser = true; // Reset flag
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
    default:
      console.error('No setup function for modal:', modalId);
  }
}

function transitionToModal(currentModal, targetModal, targetModalPath) {
  $(`#${currentModal}`).off('hidden.bs.modal');
  $(`#${currentModal}`).modal('hide');
  $(`#${currentModal}`).on('hidden.bs.modal', () => {
    showModal(targetModal, targetModalPath);
  });
}