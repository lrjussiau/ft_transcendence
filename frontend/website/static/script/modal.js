//console.log("modal.js loaded");

let modalClosedByUser = true;

document.addEventListener("DOMContentLoaded", () => {
  //console.log("DOM fully loaded and parsed");
  setupModalTriggers();
});

function setupModalTriggers() {
  //console.log("Setting up modal triggers");

  const modalTriggers = document.querySelectorAll('.modal-trigger');
  //console.log(`Found ${modalTriggers.length} modal triggers`);

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modalName = trigger.getAttribute('data-modal');
      const modalHtmlPath = trigger.getAttribute('data-html');
      //console.log(`Modal trigger clicked: ${modalName}, ${modalHtmlPath}`);
      showModal(modalName, modalHtmlPath);
    });
  });
}

function showModal(modalName, modalHtmlPath) {
  return new Promise((resolve, reject) => {
      fetch(modalHtmlPath)
          .then(response => response.text())
          .then(html => {
              const modalContainer = document.getElementById('modal-container');
              if (modalContainer) {
                  modalContainer.innerHTML = html;
                  const modalElement = $(`#${modalName}`);
                  modalElement.modal('show');
                  
                  // Bind close events
                  bindCloseEvents(modalName);

                  if (window.updateContent) {
                      window.updateContent(document.getElementById(modalName));
                  }

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

function bindCloseEvents(modalName) {
  const modalElement = $(`#${modalName}`);
  
  // Bind close button
  modalElement.find('.close').off('click').on('click', function() {
      window.hideModal(modalName);
  });

  // Bind backdrop click
  modalElement.off('click').on('click', function(event) {
      if ($(event.target).is(modalElement)) {
          window.hideModal(modalName);
      }
  });

  // Bind ESC key
  $(document).off('keydown.modalClose').on('keydown.modalClose', function(event) {
      if (event.key === "Escape") {
          window.hideModal(modalName);
      }
  });
}
function hideModal(modalName) {
  return new Promise((resolve) => {
      const modalElement = $(`#${modalName}`);
      modalElement.modal('hide');
      modalElement.on('hidden.bs.modal', function () {
          $(this).off('hidden.bs.modal');
          // Remove the modal from DOM after hiding
          modalElement.remove();
          $('.modal-backdrop').remove();
          $('body').removeClass('modal-open').css('overflow', '');
          resolve();
      });
  });
}

function handleModalHidden(modalName) {
  if (modalClosedByUser && (modalName === 'loginModal' || modalName === 'registerModal')) {
    if (!document.querySelector('.modal.show') && !localStorage.getItem('authToken')) {
      //console.log(`Modal ${modalName} hidden, redirecting to home`);
      window.history.pushState({}, '', '/home');
      handleRoute('home');
    }
  }
  modalClosedByUser = true;
}

function initializeModal(modalId) {
  console.log(`Initializing modal: ${modalId}`);
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
    case 'deleteAccountModal':
      setupDeleteAccountModal();
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