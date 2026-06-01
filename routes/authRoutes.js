const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { csrfProtect } = require('../middleware/authMiddleware');

// Страница авторизации
router.get('/auth', authController.getAuthPage);

// Регистрация
router.post('/register', csrfProtect, authController.register);

// Вход
router.post('/login', csrfProtect, authController.login);

// Выход
router.post('/logout', authController.logout);

module.exports = router;