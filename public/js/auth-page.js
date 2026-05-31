(() => {
  const sidePanel = document.getElementById('sidePanel');
  const registerContainer = document.getElementById('registerContainer');
  const sideText = document.getElementById('sideText');
  const switchButton = document.getElementById('switchButton');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const registerMainPage = document.getElementById('registerMainPage');
  const codePage = document.getElementById('codePage');
  const twoFactorForm = document.getElementById('twoFactorForm');
  const twoFactorCode = document.getElementById('twoFactorCode');
  const codeInputs = Array.from(document.querySelectorAll('.code-input'));

  if (!sidePanel || !registerContainer || !switchButton || !registerForm || !loginForm) {
    return;
  }

  const initialMode = document.body.dataset.initialMode || 'login';
  let isLoginMode = initialMode !== 'register' && initialMode !== 'verify';
  let isVerificationMode = initialMode === 'verify';

  const logoLink = document.getElementById('logoLink');
  const svgRects = document.querySelectorAll('.logo-svg rect');

  const originalPositions = [
    { x: 76.6035, y: 13.1301 },
    { x: 105.049, y: 13.1301 },
    { x: 76.6001, y: 50.3345 },
    { x: 105.057, y: 50.3345 },
  ];

  const rotatedPositions = [
    { x: 105.049, y: 13.1301 },
    { x: 105.057, y: 50.3345 },
    { x: 76.6035, y: 13.1301 },
    { x: 76.6001, y: 50.3345 },
  ];

  const animateRects = (positions) => {
    svgRects.forEach((rect, index) => {
      rect.setAttribute('x', positions[index].x);
      rect.setAttribute('y', positions[index].y);
    });
  };

  if (logoLink) {
    logoLink.addEventListener('mouseenter', () => animateRects(rotatedPositions));
    logoLink.addEventListener('mouseleave', () => animateRects(originalPositions));
  }

  const showVerificationPage = () => {
    isVerificationMode = true;
    sidePanel.classList.remove('slide-to-login');
    sidePanel.classList.add('slide-to-register');
    registerContainer.classList.add('open');

    if (registerMainPage && codePage) {
      registerMainPage.classList.add('hidden');
      codePage.classList.remove('hidden');
    }

    setTimeout(() => {
      sideText.textContent = 'Проверка почты';
      switchButton.textContent = 'Назад';
    }, 250);

    codeInputs[0]?.focus();
  };

  const showRegisterPage = () => {
    isVerificationMode = false;
    sidePanel.classList.remove('slide-to-login');
    sidePanel.classList.add('slide-to-register');
    registerContainer.classList.add('open');

    if (registerMainPage && codePage) {
      registerMainPage.classList.remove('hidden');
      codePage.classList.add('hidden');
    }

    setTimeout(() => {
      sideText.textContent = 'Есть аккаунт?';
      switchButton.textContent = 'Войти';
    }, 250);
    isLoginMode = false;
  };

  const showLoginPage = () => {
    isVerificationMode = false;
    sidePanel.classList.remove('slide-to-register');
    sidePanel.classList.add('slide-to-login');
    registerContainer.classList.remove('open');

    if (registerMainPage && codePage) {
      registerMainPage.classList.remove('hidden');
      codePage.classList.add('hidden');
    }

    setTimeout(() => {
      sideText.textContent = 'Нет аккаунта?';
      switchButton.textContent = 'Зарегистрироваться';
    }, 250);
    isLoginMode = true;
  };

  const switchForms = () => {
    if (isVerificationMode) {
      showLoginPage();
      return;
    }

    if (isLoginMode) {
      showRegisterPage();
      return;
    }

    showLoginPage();
  };

  const showError = (input, message) => {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;

    formGroup.classList.add('error');
    let errorDiv = formGroup.querySelector('.error-message:not(#passwordError)');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      formGroup.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    input.style.borderBottomColor = '#ff6b6b';
  };

  const clearErrors = (form) => {
    form.querySelectorAll('.form-group').forEach((group) => {
      group.classList.remove('error');
      group.querySelectorAll('.error-message').forEach((div) => {
        if (div.id !== 'passwordError') div.remove();
      });

      const input = group.querySelector('input, textarea');
      if (input) input.style.borderBottomColor = '';
    });
  };

  const validateLogin = () => {
    clearErrors(loginForm);
    const emailInput = document.getElementById('login_email');
    const passwordInput = document.getElementById('login_password');
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

    let isValid = true;

    if (!emailInput.value.trim()) {
      showError(emailInput, 'Пожалуйста, введите email');
      isValid = false;
    } else if (!emailRegex.test(emailInput.value.trim())) {
      showError(emailInput, 'Введите корректный email (example@domain.com)');
      isValid = false;
    }

    if (!passwordInput.value.trim()) {
      showError(passwordInput, 'Пожалуйста, введите пароль');
      isValid = false;
    }

    return isValid;
  };

  const validateRegister = () => {
    clearErrors(registerForm);

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('reg_email');
    const passwordInput = document.getElementById('reg_password');
    const confirmInput = document.getElementById('confirm_password');
    const agreeTerms = document.getElementById('agreeTerms');
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

    const passwordErrorDiv = document.getElementById('passwordError');
    passwordErrorDiv.style.display = 'none';

    let isValid = true;

    if (!nameInput.value.trim()) {
      showError(nameInput, 'Пожалуйста, введите ваше имя');
      isValid = false;
    }

    if (!emailInput.value.trim()) {
      showError(emailInput, 'Пожалуйста, введите email');
      isValid = false;
    } else if (!emailRegex.test(emailInput.value.trim())) {
      showError(emailInput, 'Введите корректный email (example@domain.com)');
      isValid = false;
    }

    if (!passwordInput.value.trim()) {
      showError(passwordInput, 'Пожалуйста, введите пароль');
      isValid = false;
    }

    if (!confirmInput.value.trim()) {
      showError(confirmInput, 'Пожалуйста, повторите пароль');
      isValid = false;
    } else if (passwordInput.value !== confirmInput.value) {
      passwordErrorDiv.style.display = 'block';
      passwordInput.style.borderBottomColor = '#ff6b6b';
      confirmInput.style.borderBottomColor = '#ff6b6b';
      isValid = false;
    }

    if (!agreeTerms.checked) {
      const checkboxLabel = document.querySelector('.custom-checkbox');
      checkboxLabel.style.border = '1px solid #ff6b6b';
      checkboxLabel.style.borderRadius = '8px';
      checkboxLabel.style.padding = '8px 12px';
      checkboxLabel.style.backgroundColor = 'rgba(255, 107, 107, 0.05)';
      setTimeout(() => {
        checkboxLabel.style.border = '';
        checkboxLabel.style.padding = '';
        checkboxLabel.style.backgroundColor = '';
      }, 2000);
      isValid = false;
    }

    if (isValid) {
      const fullName = nameInput.value.trim();
      const [firstName, ...lastNameParts] = fullName.split(/\s+/);
      document.getElementById('first_name').value = firstName || '';
      document.getElementById('last_name').value = lastNameParts.join(' ') || '-';
    }

    return isValid;
  };

  const updateTwoFactorCode = () => {
    if (!twoFactorCode) return '';
    const code = codeInputs.map((input) => input.value).join('');
    twoFactorCode.value = code;
    return code;
  };

  codeInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      updateTwoFactorCode();

      if (input.value && codeInputs[index + 1]) {
        codeInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && codeInputs[index - 1]) {
        codeInputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (event) => {
      event.preventDefault();
      const pastedCode = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
      pastedCode.split('').forEach((digit, digitIndex) => {
        if (codeInputs[digitIndex]) {
          codeInputs[digitIndex].value = digit;
        }
      });
      updateTwoFactorCode();
      codeInputs[Math.min(pastedCode.length, codeInputs.length) - 1]?.focus();
    });
  });

  loginForm.addEventListener('submit', (event) => {
    if (!validateLogin()) {
      event.preventDefault();
    }
  });

  registerForm.addEventListener('submit', (event) => {
    if (!validateRegister()) {
      event.preventDefault();
    }
  });

  if (twoFactorForm) {
    twoFactorForm.addEventListener('submit', (event) => {
      if (event.submitter?.formAction.endsWith('/cancel-2fa')) {
        return;
      }

      const code = updateTwoFactorCode();
      if (!/^\d{4}$/.test(code)) {
        event.preventDefault();
        codeInputs.forEach((input) => {
          input.style.borderBottomColor = '#ff6b6b';
        });
        codeInputs[0]?.focus();
      }
    });
  }

  switchButton.addEventListener('click', switchForms);

  if (initialMode === 'verify') {
    showVerificationPage();
  } else if (!isLoginMode) {
    showRegisterPage();
  }
})();
