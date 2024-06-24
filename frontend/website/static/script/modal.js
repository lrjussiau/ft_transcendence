console.log("modal.js loaded");

let modalClosedByUser = true;

async function showModal(modalName, modalHtmlPath) {
  try {
    console.log(`Loading modal: ${modalName}`);
    
    // Remove any existing modal content
    const existingModal = document.getElementById(modalName);
    if (existingModal) {
      existingModal.remove();
    }
    
    const response = await fetch(modalHtmlPath);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const html = await response.text();
    const modalContainer = document.getElementById('modal-container');

    if (modalContainer) {
      modalContainer.innerHTML = html;
      const modalElement = $(`#${modalName}`);
      modalElement.modal('show');
      console.log(`${modalName} is now shown`);

      // Add event listener to handle redirection when modal is closed
      modalElement.on('hidden.bs.modal', () => handleModalHidden(modalName));

      if (modalName === 'loginModal') {
        setupLoginForm();
        setupRegisterButton();
      } else if (modalName === 'registerModal') {
        setupRegisterForm();
      }
    } else {
      console.error('#modal-container element not found');
    }
  } catch (error) {
    console.error('Failed to load modal:', error);
  }
}

function hideModal(modalName) {
  modalClosedByUser = false; // Set flag to indicate modal is being closed programmatically
  const modalElement = $(`#${modalName}`);
  modalElement.modal('hide');
  document.getElementById('modal-container').innerHTML = ''; // Clear the modal content
}

function handleModalHidden(modalName) {
  if ((modalName === 'loginModal' || modalName === 'registerModal') && modalClosedByUser) {
    console.log(`Modal ${modalName} hidden, redirecting to home`);
    window.history.pushState({}, '', '/home');
    handleRoute('home');
  }
  modalClosedByUser = true; // Reset flag
}

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

function setupRegisterButton() {
  const registerButton = document.getElementById('register-button');
  if (registerButton) {
    registerButton.addEventListener('click', () => {
      console.log('Register button clicked');
      transitionToModal('loginModal', 'registerModal', '/static/modals/auth.html');
    });
  } else {
    console.error('#register-button element not found');
  }
}

function transitionToModal(currentModal, targetModal, targetModalPath) {
  $(`#${currentModal}`).off('hidden.bs.modal');
  $(`#${currentModal}`).modal('hide');
  $(`#${currentModal}`).on('hidden.bs.modal', () => {
    showModal(targetModal, targetModalPath);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupModalTriggers();
});
