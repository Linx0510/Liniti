const express = require('express');
const authController = require('../controllers/authController');
const { verifyCsrfToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/auth', authController.getAuthPage);
router.get('/aut', (req, res) => res.redirect('/auth'));
router.get('/aut.html', (req, res) => res.redirect('/auth'));
router.get('/aut.ejs', (req, res) => res.redirect('/auth'));
router.post('/register', verifyCsrfToken, authController.register);
router.post('/login', verifyCsrfToken, authController.login);
router.post('/logout', verifyCsrfToken, authController.logout);

module.exports = router;
