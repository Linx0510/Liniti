(function () {
  const root = document.getElementById('authRoot');
  if (!root) return;

  const registerContainer = document.getElementById('registerContainer');
  const authPanel = document.getElementById('authPanel');
  const toggleButton = document.getElementById('toggleAuthMode');
  const panelTitle = document.getElementById('panelTitle');
  const panelText = document.getElementById('panelText');

  let isRegisterMode = root.dataset.initialMode === 'register';

  const applyMode = () => {
    registerContainer.classList.toggle('open', isRegisterMode);
    authPanel.classList.toggle('slide-to-register', isRegisterMode);
    authPanel.classList.toggle('slide-to-login', !isRegisterMode);

    panelTitle.textContent = isRegisterMode ? 'Уже есть аккаунт?' : 'Добро пожаловать';
    panelText.textContent = isRegisterMode
      ? 'Войдите, чтобы продолжить работу на платформе'
      : 'Войдите в аккаунт, чтобы продолжить работу на платформе';
    toggleButton.textContent = isRegisterMode ? 'Перейти ко входу' : 'Создать аккаунт';
  };

  toggleButton.addEventListener('click', function () {
    isRegisterMode = !isRegisterMode;
    applyMode();
  });

  const forms = root.querySelectorAll('form[novalidate]');
  forms.forEach((form) => {
    form.addEventListener('submit', function (event) {
      let hasError = false;

      const groups = form.querySelectorAll('.form-group');
      groups.forEach((group) => group.classList.remove('error'));

      const requiredFields = form.querySelectorAll('input[required]');
      requiredFields.forEach((input) => {
        const group = input.closest('.form-group');
        if (!group) return;

        if (!input.value.trim()) {
          group.classList.add('error');
          hasError = true;
          return;
        }

        if (input.type === 'email' && !input.checkValidity()) {
          group.classList.add('error');
          hasError = true;
        }

        if (input.type === 'password' && input.minLength > 0 && input.value.length < input.minLength) {
          group.classList.add('error');
          hasError = true;
        }
      });

      const password = form.querySelector('input[name="password"]');
      const confirmPassword = form.querySelector('input[name="confirm_password"]');
      if (password && confirmPassword && password.value !== confirmPassword.value) {
        const group = confirmPassword.closest('.form-group');
        if (group) {
          group.classList.add('error');
          hasError = true;
        }
      }

      if (hasError) {
        event.preventDefault();
      }
    });
  });

  applyMode();
})();
