'use strict';

const accountForm = document.getElementById('account-form');
const accountAlert = document.getElementById('account-alert');
const accountLoggedOut = document.getElementById('account-logged-out');

document.addEventListener('DOMContentLoaded', async () => {
  const user = DataService.getCurrentVolunteerUser();

  if (!user) {
    if (accountLoggedOut) accountLoggedOut.classList.remove('hidden');
    if (accountForm) accountForm.classList.add('hidden');
    return;
  }

  if (accountForm) {
    accountForm.classList.remove('hidden');
    accountForm.elements['firstName'].value = user.firstName || '';
    accountForm.elements['lastName'].value = user.lastName || '';
    accountForm.elements['email'].value = user.email || '';
    accountForm.elements['phone'].value = user.phone || '';
    accountForm.addEventListener('submit', handleSaveAccount);
  }
});

async function handleSaveAccount(e) {
  e.preventDefault();

  const result = await DataService.updateVolunteerUser({
    firstName: accountForm.elements['firstName'].value.trim(),
    lastName: accountForm.elements['lastName'].value.trim(),
    email: accountForm.elements['email'].value.trim(),
    phone: accountForm.elements['phone'].value.trim(),
  });

  if (!result.success) {
    showAccountAlert(result.error, true);
    return;
  }

  showAccountAlert('Vos informations ont été mises à jour.', false);
}

function showAccountAlert(message, isError = false) {
  if (!accountAlert) return;
  accountAlert.textContent = message;
  accountAlert.classList.toggle('hidden', false);
  accountAlert.classList.toggle('error', isError);
}