const express = require('express');
const pageController = require('../controllers/pageController');

const router = express.Router();

router.get('/', pageController.getIndexPage);
router.get('/index.html', (req, res) => res.redirect('/'));
router.get('/lenta_new.html', pageController.getLentaPage);
router.get('/lenta_new', (req, res) => res.redirect('/lenta_new.html'));

module.exports = router;
