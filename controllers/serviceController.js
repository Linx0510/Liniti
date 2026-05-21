const db = require('../config/database');

const createService = async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');

  try {
    const userId = req.session.user.id;
    const title = String(req.body.title || '').trim();
    const fullDescription = String(req.body.full_description || '').trim();
    const buyerRequirements = String(req.body.buyer_requirements || '').trim();
    const description = [fullDescription, buyerRequirements ? `Требования: ${buyerRequirements}` : '']
      .filter(Boolean)
      .join('\n\n');
    const priceFrom = Number(req.body.price_from ?? req.body.price ?? 0);
    const priceTo = Number(req.body.price_to ?? req.body.price ?? 0);
    const executionDays = Number(req.body.delivery_days || 1);
    const selected = Array.isArray(req.body.categories)
      ? req.body.categories
      : req.body.categories
        ? [req.body.categories]
        : [];

    if (
      !title
      || Number.isNaN(priceFrom)
      || Number.isNaN(priceTo)
      || priceFrom < 0
      || priceTo < 0
      || priceTo < priceFrom
      || !Number.isInteger(executionDays)
      || executionDays < 1
    ) {
      return res.status(400).send('Некорректные данные услуги');
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (service_id, category_id)
      )
    `);

    const startDate = new Date();
    const deadlineDate = new Date(startDate);
    deadlineDate.setDate(deadlineDate.getDate() + executionDays);

    const coverPath = req.file ? `/uploads/${req.file.filename}` : null;

    const coverColumnResult = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'services'
        AND column_name IN ('cover_image', 'cover')
      ORDER BY CASE column_name WHEN 'cover_image' THEN 1 WHEN 'cover' THEN 2 ELSE 3 END
      LIMIT 1
    `);

    const coverColumn = coverColumnResult.rows[0]?.column_name || null;
    const insertColumns = ['user_id', 'title', 'description', 'price_from', 'price_to', 'execution_days', 'start_date', 'deadline'];
    const insertValues = [
      userId,
      title,
      description || null,
      priceFrom,
      priceTo,
      executionDays,
      startDate.toISOString().split('T')[0],
      deadlineDate.toISOString().split('T')[0],
    ];

    if (coverColumn) {
      insertColumns.push(coverColumn);
      insertValues.push(coverPath);
    }

    const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');

    const created = await db.query(
      `INSERT INTO services (${insertColumns.join(', ')})
       VALUES (${placeholders})
       RETURNING id`,
      insertValues
    );

    const serviceId = created.rows[0].id;
    for (const categoryIdRaw of selected) {
      const categoryId = Number(categoryIdRaw);
      if (!Number.isInteger(categoryId)) continue;
      await db.query(
        `INSERT INTO service_categories (service_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [serviceId, categoryId]
      );
    }

    return res.redirect('/services');
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).send('Ошибка создания услуги');
  }
};

module.exports = { createService };
