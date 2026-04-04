const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const workController = require('../controllers/workController');
const { requireAuth, csrfProtect } = require('../middleware/authMiddleware');

// Публичные маршруты
router.get('/', pageController.getIndexPage);
router.get('/lenta', pageController.getLentaPage);

// Профиль - используем два отдельных маршрута вместо опционального параметра
router.get('/profile', pageController.getProfilePage);  // текущий пользователь
router.get('/profile/:id', pageController.getProfilePage); // конкретный пользователь

// Защищённые маршруты (требуют авторизации)
router.post('/works/create', requireAuth, csrfProtect, workController.createWork);
router.post('/works/:workId/report', requireAuth, csrfProtect, workController.reportWork);

// Страница чата
router.get('/chat', requireAuth, (req, res) => {
    res.render('chat');
});

module.exports = router;