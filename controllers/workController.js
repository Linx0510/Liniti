const db = require('../config/database');

const createWork = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { title, description, categories, images } = req.body;
  
  try {
    // Создаём работу
    const workResult = await db.query(`
      INSERT INTO works (user_id, title, description, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `, [req.session.user.id, title, description]);
    
    const workId = workResult.rows[0].id;
    
    // Добавляем категории
    if (categories && categories.length > 0) {
      for (const categoryId of categories) {
        await db.query(`
          INSERT INTO work_categories (work_id, category_id)
          VALUES ($1, $2)
        `, [workId, categoryId]);
      }
    }
    
    // Добавляем изображения
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await db.query(`
          INSERT INTO work_images (work_id, image_url, sort_order)
          VALUES ($1, $2, $3)
        `, [workId, images[i], i]);
      }
    }
    
    res.status(201).json({ success: true, workId });
  } catch (error) {
    console.error('Error creating work:', error);
    res.status(500).json({ error: 'Ошибка при создании работы' });
  }
};

const reportWork = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth');
  }
  
  const { workId } = req.params;
  const { reason } = req.body;
  
  try {
    // Находим ID причины жалобы
    const reasonResult = await db.query(`
      SELECT id FROM complaint_reasons WHERE name = $1
    `, [reason]);
    
    if (reasonResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid reason' });
    }
    
    await db.query(`
      INSERT INTO complaints (sender_id, work_id, reason_id, status)
      VALUES ($1, $2, $3, 'pending')
    `, [req.session.user.id, workId, reasonResult.rows[0].id]);
    
    res.redirect('/lenta?success=Жалоба отправлена');
  } catch (error) {
    console.error('Error reporting work:', error);
    res.status(500).json({ error: 'Ошибка при отправке жалобы' });
  }
};

module.exports = {
  createWork,
  reportWork,
};