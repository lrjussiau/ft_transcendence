let modalClosedByUser = true;

document.addEventListener("DOMContentLoaded", () => {
  setupModalTriggers();
});

function setupModalTriggers() {

  const modalTriggers = document.querySelectorAll('.modal-trigger');
  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modalName = trigger.getAttribute('data-modal');
      const modalHtmlPath = trigger.getAttribute('data-html');
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
  
  modalElement.find('.close').off('click').on('click', function() {
      window.hideModal(modalName);
  });

  modalElement.off('click').on('click', function(event) {
      if ($(event.target).is(modalElement)) {
          window.hideModal(modalName);
      }
  });

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

window.showModal = showModal;
window.hideModal = hideModal;
window.transitionToModal = transitionToModal;