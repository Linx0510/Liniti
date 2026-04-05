const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const MAX_WORK_IMAGES = 12;

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const saveBase64Image = (base64String) => {
  if (typeof base64String !== 'string') return null;

  const matches = base64String.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) {
    return null;
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const extensionMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const ext = extensionMap[mimeType.toLowerCase()];
  if (!ext) return null;

  const fileName = `work-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  return `/uploads/${fileName}`;
};

const createWork = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { title, description, categories, images } = req.body;
  const uploadedImagesCount = Array.isArray(req.files) ? req.files.length : 0;
  const requestImages = Array.isArray(images)
    ? images
    : (images ? [images] : []);

  if (uploadedImagesCount + requestImages.length > MAX_WORK_IMAGES) {
    return res.status(400).json({ error: `Можно загрузить не более ${MAX_WORK_IMAGES} изображений` });
  }
  
  try {
    // Создаём работу
    const workResult = await db.query(`
      INSERT INTO works (user_id, title, description, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `, [req.session.user.id, title, description]);
    
    const workId = workResult.rows[0].id;
    
    const selectedCategories = Array.isArray(categories)
      ? categories
      : (categories ? [categories] : []);
    const uniqueCategoryIds = [...new Set(selectedCategories
      .map((categoryId) => parseInt(categoryId, 10))
      .filter((categoryId) => Number.isInteger(categoryId)))];

    if (uniqueCategoryIds.length > 8) {
      return res.status(400).json({ error: 'Можно выбрать не более 8 подкатегорий' });
    }

    // Добавляем категории
    if (uniqueCategoryIds.length > 0) {
      for (const categoryId of uniqueCategoryIds) {
        await db.query(`
          INSERT INTO work_categories (work_id, category_id)
          VALUES ($1, $2)
        `, [workId, categoryId]);
      }
    }
    
    const uploadedImages = Array.isArray(req.files)
      ? req.files
          .map((file) => (file && file.filename ? `/uploads/${file.filename}` : null))
          .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim())
      : [];

    const base64ImageUrls = requestImages
      .map((image) => saveBase64Image(image))
      .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim());

    const imageUrls = [...uploadedImages, ...base64ImageUrls];

    if (imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        await db.query(`
          INSERT INTO work_images (work_id, image_url, sort_order)
          VALUES ($1, $2, $3)
        `, [workId, imageUrls[i], i]);
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
