const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const workController = require('../controllers/workController');
const { requireAuth, csrfProtect } = require('../middleware/authMiddleware');

// Публичные маршруты
router.get('/', pageController.getIndexPage);
router.get('/lenta', pageController.getLentaPage);
router.get('/services', (req, res) => {
    res.redirect('/lenta');
});

// Переход из шапки по поиску
router.get('/works/search', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const searchParams = query ? `?q=${encodeURIComponent(query)}` : '';
    res.redirect(`/lenta${searchParams}`);
});

// Профиль - используем два отдельных маршрута вместо опционального параметра
router.get('/profile', pageController.getProfilePage);  // текущий пользователь
router.get('/profile/:id', pageController.getProfilePage); // конкретный пользователь
router.get('/portfolio', requireAuth, (req, res) => {
    res.redirect('/profile');
});

// Защищённые маршруты (требуют авторизации)
router.post('/works/create', requireAuth, csrfProtect, workController.createWork);
router.post('/works/:workId/report', requireAuth, csrfProtect, workController.reportWork);

// Страница чата
router.get('/chat', requireAuth, (req, res) => {
    res.render('chat');
});
router.get('/messages', requireAuth, (req, res) => {
    res.redirect('/chat');
});


// Страницы пользователя
router.get('/orders', requireAuth, (req, res) => {
    res.render('orders');
});
router.get('/vacancies', requireAuth, (req, res) => {
    res.redirect('/orders');
});

router.get('/settings', requireAuth, (req, res) => {
    res.render('settings');
});
router.get('/account/settings', requireAuth, (req, res) => {
    res.redirect('/settings');
});

module.exports = router;
