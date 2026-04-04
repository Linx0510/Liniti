const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/auth', authController.getAuthPage);
router.get('/aut.html', (req, res) => res.redirect('/auth'));
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

module.exports = router;
