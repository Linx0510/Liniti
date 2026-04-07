const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin, logActivity } = require('../middleware/adminMiddleware');

// Все маршруты админ-панели требуют прав администратора
router.use(requireAdmin);

// Главная страница админки
router.get('/', adminController.getDashboard);
router.get('/dashboard', adminController.getDashboard);

// Управление пользователями
router.get('/users', adminController.getUsers);
router.post('/users/:id/edit', adminController.editUser);
router.post('/users/:id/block', adminController.blockUser);
router.post('/users/:id/unblock', adminController.unblockUser);

// Управление работами
router.get('/works', adminController.getWorks);
router.post('/works/:id/moderate', adminController.moderateWork);

// Управление жалобами
router.get('/complaints', adminController.getComplaints);
router.post('/complaints/:id/resolve', adminController.resolveComplaint);

// Экспорт данных
router.get('/export', adminController.exportData);

// Настройки
router.post('/settings', adminController.updateSettings);

module.exports = router;
