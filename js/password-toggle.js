'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('[data-password-toggle]');

  buttons.forEach(button => {
    const targetId = button.getAttribute('data-password-toggle');
    const input = targetId ? document.getElementById(targetId) : null;

    if (!input) return;

    button.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.classList.toggle('is-visible', isHidden);
      button.setAttribute('aria-label', isHidden ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      button.setAttribute('aria-pressed', String(isHidden));
      button.textContent = isHidden ? '🙈' : '👁️';
      input.focus({ preventScroll: true });
    });
  });
});