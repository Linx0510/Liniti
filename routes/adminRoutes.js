const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin, logActivity } = require('../middleware/adminMiddleware');

// Все маршруты админ-панели требуют прав администратора
router.use(requireAdmin);

// Главная страница админки
router.get('/admin', adminController.getDashboard);
router.get('/admin/dashboard', adminController.getDashboard);

// Управление пользователями
router.get('/admin/users', adminController.getUsers);
router.post('/admin/users/:id/edit', adminController.editUser);
router.post('/admin/users/:id/block', adminController.blockUser);
router.post('/admin/users/:id/unblock', adminController.unblockUser);

// Управление работами
router.get('/admin/works', adminController.getWorks);
router.post('/admin/works/:id/moderate', adminController.moderateWork);

// Управление жалобами
router.get('/admin/complaints', adminController.getComplaints);
router.post('/admin/complaints/:id/resolve', adminController.resolveComplaint);

// Экспорт данных
router.get('/admin/export', adminController.exportData);

// Настройки
router.post('/admin/settings', adminController.updateSettings);

module.exports = router;