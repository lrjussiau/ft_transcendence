console.log("modal.js loaded");

async function showModal(modalName, modalHtmlPath) {
  try {
    console.log(`Loading modal: ${modalName}`);
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
      modalElement.on('hidden.bs.modal', handleModalHidden);

      // Re-setup modal triggers
      setupModalTriggers();

      if (modalName === 'loginModal') {
        setupLoginForm();
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
  const modalElement = $(`#${modalName}`);
  modalElement.modal('hide');
  document.getElementById('modal-container').innerHTML = ''; // Clear the modal content
}

function handleModalHidden() {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer.innerHTML.includes('loginModal') || modalContainer.innerHTML.includes('registerModal')) {
    console.log('Modal hidden, redirecting to home');
    window.history.pushState({}, '', '/home');
    handleRoute('home');
  }
  // Remove event listener to prevent unwanted redirection
  $(this).off('hidden.bs.modal', handleModalHidden);
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

  // Additional buttons for login and register
  const registerButton = document.getElementById('register-button');
  if (registerButton) {
    registerButton.addEventListener('click', () => {
      console.log('Register button clicked');
      transitionToModal('loginModal', 'registerModal', '/static/modals/auth.html');
    });
  } else {
    console.error('#register-button element not found');
  }

  const loginModalTrigger = document.getElementById('loginModalTrigger');
  if (loginModalTrigger) {
    loginModalTrigger.addEventListener('click', () => {
      console.log('Login modal trigger clicked');
      showModal('loginModal', '/static/modals/auth.html');
    });
  } else {
    console.error('#loginModalTrigger element not found');
  }
}

function transitionToModal(currentModal, targetModal, targetModalPath) {
  $(`#${currentModal}`).off('hidden.bs.modal', handleModalHidden); // Temporarily disable redirection
  $(`#${currentModal}`).modal('hide');
  $(`#${currentModal}`).on('hidden.bs.modal', () => {
    showModal(targetModal, targetModalPath);
  });
}

// Call setupModalTriggers to initialize event listeners after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  setupModalTriggers();
});
