const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const pageController = require('../controllers/pageController');
const workController = require('../controllers/workController');
const { requireAuth, csrfProtect } = require('../middleware/authMiddleware');
const MAX_WORK_IMAGES = 10;

const worksUploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(worksUploadDir)) {
    fs.mkdirSync(worksUploadDir, { recursive: true });
}

const workStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, worksUploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.jpg';
        cb(null, `work-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
});

const workUpload = multer({
    storage: workStorage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: MAX_WORK_IMAGES,
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        return cb(new Error('Разрешены только изображения'));
    },
});

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
router.get('/works/create', requireAuth, pageController.getCreateWorkPage);
router.post('/works/create', requireAuth, workUpload.array('workImages', MAX_WORK_IMAGES), csrfProtect, workController.createWork);
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
