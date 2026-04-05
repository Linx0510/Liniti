const db = require('../config/database');
const fs = require('fs');
const path = require('path');

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

    const requestImages = Array.isArray(images)
      ? images
      : (images ? [images] : []);
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
  const complaintDetails = (req.body.details || '').trim();
  const reasonIdsRaw = Array.isArray(req.body.reason_ids)
    ? req.body.reason_ids
    : [req.body.reason_ids];
  const reasonIds = [...new Set(
    reasonIdsRaw
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
  
  try {
    if (reasonIds.length === 0) {
      return res.status(400).json({ error: 'Выберите минимум одну причину жалобы' });
    }

    await db.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS details TEXT`);

    const existingReasons = await db.query(`
      SELECT id
      FROM complaint_reasons
      WHERE id = ANY($1::int[])
    `, [reasonIds]);

    const existingReasonIds = new Set(existingReasons.rows.map((row) => row.id));
    const filteredReasonIds = reasonIds.filter((id) => existingReasonIds.has(id));

    if (filteredReasonIds.length === 0) {
      return res.status(400).json({ error: 'Выбранные причины жалобы недоступны' });
    }

    for (const reasonId of filteredReasonIds) {
      await db.query(`
        INSERT INTO complaints (sender_id, work_id, reason_id, details, status)
        VALUES ($1, $2, $3, $4, 'pending')
      `, [req.session.user.id, workId, reasonId, complaintDetails || null]);
    }
    
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
