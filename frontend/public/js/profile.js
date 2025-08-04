/**
 * profile.js - Funcionalidades para a página de perfil do usuário
 */
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar toast do Bootstrap se existir
  const toastElList = [].slice.call(document.querySelectorAll('.toast'));
  toastElList.map(function(toastEl) {
    return new bootstrap.Toast(toastEl);
  });

  // Manipular botão de edição
  const editProfileBtn = document.querySelector('a[href="/profile/edit"]');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '/profile/edit';
    });
  }

  // Inicializar tooltips se existirem
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});