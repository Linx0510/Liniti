const db = require('../config/database');

const createService = async (req, res) => {
  if (!req.session.user) return res.redirect('/auth');

  try {
    const userId = req.session.user.id;
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const price = Number(req.body.price || 0);
    const selected = Array.isArray(req.body.categories)
      ? req.body.categories
      : req.body.categories
        ? [req.body.categories]
        : [];

    if (!title || Number.isNaN(price) || price < 0) {
      return res.status(400).send('Некорректные данные услуги');
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (service_id, category_id)
      )
    `);

    const created = await db.query(
      `INSERT INTO services (user_id, title, description, price) VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, title, description || null, price]
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
