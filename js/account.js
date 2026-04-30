'use strict';

const accountForm = document.getElementById('account-form');
const accountAlert = document.getElementById('account-alert');
const accountAlertMessage = accountAlert ? accountAlert.querySelector('.alert-message') : null;
const accountLoggedOut = document.getElementById('account-logged-out');
const accountSubmitButton = accountForm ? accountForm.querySelector('button[type="submit"]') : null;

document.addEventListener('DOMContentLoaded', async () => {
  const sessionUser = DataService.getCurrentVolunteerUser();

  // Attempt to load the freshest user record from the DB
  let user = sessionUser;
  if (sessionUser && sessionUser.id && DataService.getVolunteerUserById) {
    try {
      const remote = await DataService.getVolunteerUserById(sessionUser.id);
      if (remote) user = remote;
    } catch (e) {
      console.warn('Impossible de récupérer l\'utilisateur depuis la BD:', e);
    }
  }

  if (!user) {
    if (accountLoggedOut) accountLoggedOut.classList.remove('hidden');
    if (accountForm) accountForm.classList.add('hidden');
    return;
  }

  if (accountForm) {
    accountForm.classList.remove('hidden');
    // Fill values from DB/session; set placeholder when empty
    const fn = user.firstName || '';
    const ln = user.lastName || '';
    const em = user.email || '';
    const ph = user.phone || '';

    accountForm.elements['firstName'].value = fn;
    accountForm.elements['firstName'].placeholder = fn ? '' : 'Entrez la valeur';

    accountForm.elements['lastName'].value = ln;
    accountForm.elements['lastName'].placeholder = ln ? '' : 'Entrez la valeur';

    accountForm.elements['email'].value = em;
    accountForm.elements['email'].placeholder = em ? '' : 'Entrez la valeur';

    accountForm.elements['phone'].value = ph;
    accountForm.elements['phone'].placeholder = ph ? '' : 'Entrez la valeur';
    accountForm.addEventListener('submit', handleSaveAccount);
  }
});

async function handleSaveAccount(e) {
  e.preventDefault();

  if (accountSubmitButton) {
    accountSubmitButton.disabled = true;
    accountSubmitButton.textContent = 'Enregistrement...';
  }

  const result = await DataService.updateVolunteerUser({
    firstName: accountForm.elements['firstName'].value.trim(),
    lastName: accountForm.elements['lastName'].value.trim(),
    email: accountForm.elements['email'].value.trim(),
    phone: accountForm.elements['phone'].value.trim(),
  });

  if (!result.success) {
    showAccountAlert(result.error, true);
    if (accountSubmitButton) {
      accountSubmitButton.disabled = false;
      accountSubmitButton.textContent = 'Enregistrer les modifications';
    }
    return;
  }

  if (result.user) {
    accountForm.elements['firstName'].value = result.user.firstName || '';
    accountForm.elements['lastName'].value = result.user.lastName || '';
    accountForm.elements['email'].value = result.user.email || '';
    accountForm.elements['phone'].value = result.user.phone || '';
  }

  showAccountAlert('Vos informations ont été mises à jour.', false);

  if (accountSubmitButton) {
    accountSubmitButton.disabled = false;
    accountSubmitButton.textContent = 'Enregistrer les modifications';
  }
}

function showAccountAlert(message, isError = false) {
  if (!accountAlert) return;
  if (accountAlertMessage) {
    accountAlertMessage.textContent = message;
  } else {
    accountAlert.textContent = message;
  }
  accountAlert.classList.toggle('hidden', false);
  accountAlert.classList.toggle('error', isError);
  accountAlert.classList.toggle('alert-success', !isError);
  accountAlert.classList.toggle('alert-danger', isError);
  accountAlert.classList.toggle('alert-info', false);
}