const db = require('../config/database');

const getIndexPage = async (req, res) => {
  try {
    // Получаем последние работы для демонстрации
    const recentWorks = await db.query(`
      SELECT
        w.id,
        w.title,
        w.created_at,
        u.first_name,
        u.last_name,
        COALESCE((
          SELECT wi.image_url
          FROM work_images wi
          WHERE wi.work_id = w.id
            AND wi.image_url IS NOT NULL
            AND BTRIM(wi.image_url) <> ''
          ORDER BY COALESCE(wi.sort_order, 0), wi.id
          LIMIT 1
        ), '/img/ab934e72b62ae5df2cfc9b2102b0e228.jpg') AS preview_image
      FROM works w
      JOIN users u ON w.user_id = u.id
      WHERE w.status = 'active'
      ORDER BY w.created_at DESC
      LIMIT 6
    `);
    
    res.render('index', {
      recentWorks: recentWorks.rows,
    });
  } catch (error) {
    console.error('Error loading index page:', error);
    res.render('index', { recentWorks: [] });
  }
};

const getLentaPage = async (req, res) => {
  try {
    const currentUserId = req.session.user?.id || null;
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const searchPattern = searchQuery ? `%${searchQuery}%` : null;

    await db.query(`
      CREATE TABLE IF NOT EXISTS work_likes (
        work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (work_id, user_id)
      )
    `);

    // Получаем все активные работы с информацией о пользователях
    const works = await db.query(`
      SELECT 
        w.*,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.avatar,
        COALESCE((
          SELECT ARRAY_AGG(wi.image_url ORDER BY COALESCE(wi.sort_order, 0), wi.id)
          FROM work_images wi
          WHERE wi.work_id = w.id
            AND wi.image_url IS NOT NULL
            AND BTRIM(wi.image_url) <> ''
        ), ARRAY[]::text[]) as images,
        COALESCE((
          SELECT ARRAY_AGG(DISTINCT c.name ORDER BY c.name)
          FROM work_categories wc
          JOIN categories c ON c.id = wc.category_id
          WHERE wc.work_id = w.id
            AND c.name IS NOT NULL
        ), ARRAY[]::text[]) as categories,
        COALESCE((
          SELECT ARRAY_AGG(DISTINCT c.id ORDER BY c.id)
          FROM work_categories wc
          JOIN categories c ON c.id = wc.category_id
          WHERE wc.work_id = w.id
        ), ARRAY[]::integer[]) as category_ids,
        COALESCE((
          SELECT TRUE
          FROM work_likes wl
          WHERE wl.work_id = w.id AND wl.user_id = $1
          LIMIT 1
        ), FALSE) as is_liked,
        COALESCE((
          SELECT TRUE
          FROM subscriptions s
          WHERE s.follower_id = $1 AND s.followed_id = u.id
          LIMIT 1
        ), FALSE) as is_subscribed
      FROM works w
      JOIN users u ON w.user_id = u.id
      WHERE w.status = 'active'
        AND (
          $2::text IS NULL
          OR w.title ILIKE $2
          OR u.first_name ILIKE $2
          OR u.last_name ILIKE $2
          OR CONCAT_WS(' ', u.first_name, u.last_name) ILIKE $2
          OR EXISTS (
            SELECT 1
            FROM work_categories wc_filter
            JOIN categories c_filter ON c_filter.id = wc_filter.category_id
            LEFT JOIN categories parent_c ON parent_c.id = c_filter.parent_id
            WHERE wc_filter.work_id = w.id
              AND (
                c_filter.name ILIKE $2
                OR parent_c.name ILIKE $2
              )
          )
        )
      ORDER BY w.created_at DESC
    `, [currentUserId, searchPattern]);
    
    // Получаем категории для фильтра
    const categories = await db.query(`
      SELECT * FROM categories WHERE parent_id IS NULL
    `);
    
    // Получаем подкатегории
    const subcategories = await db.query(`
      SELECT * FROM categories WHERE parent_id IS NOT NULL
    `);
    
    res.render('lenta_new', {
      works: works.rows,
      categories: categories.rows,
      subcategories: subcategories.rows,
      searchQuery,
    });
  } catch (error) {
    console.error('Error loading lenta page:', error);
    res.render('lenta_new', { works: [], categories: [], subcategories: [], searchQuery: '' });
  }
};

const getProfilePage = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth');
  }
  
  try {
    const userId = req.params.id || req.session.user.id;
    const currentUserId = req.session.user?.id || null;

    await db.query(`
      CREATE TABLE IF NOT EXISTS work_likes (
        work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (work_id, user_id)
      )
    `);
    
    const userResult = await db.query(`
      SELECT 
        u.*,
        r.name as role_name,
        COALESCE((
          SELECT AVG(rating) FROM user_reviews WHERE reviewed_user_id = u.id
        ), 0) as avg_rating,
        COALESCE((
          SELECT COUNT(*) FROM user_reviews WHERE reviewed_user_id = u.id
        ), 0) as total_reviews
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).send('Пользователь не найден');
    }
    
    const user = userResult.rows[0];
    
    // Получаем опубликованные работы пользователя
    const works = await db.query(`
      SELECT w.*,
             COALESCE(
               ARRAY_AGG(DISTINCT wi.image_url) FILTER (
                 WHERE wi.image_url IS NOT NULL AND BTRIM(wi.image_url) <> ''
               ),
               ARRAY[]::text[]
             ) as images,
             COALESCE(
               ARRAY_AGG(DISTINCT c.name ORDER BY c.name) FILTER (
                 WHERE c.name IS NOT NULL
               ),
               ARRAY[]::text[]
             ) as categories,
             COALESCE((
               SELECT TRUE
               FROM work_likes wl
               WHERE wl.work_id = w.id AND wl.user_id = $2
               LIMIT 1
             ), FALSE) as is_liked
      FROM works w
      LEFT JOIN work_images wi ON w.id = wi.work_id
      LEFT JOIN work_categories wc ON w.id = wc.work_id
      LEFT JOIN categories c ON wc.category_id = c.id
      WHERE w.user_id = $1 AND w.status = 'active'
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `, [userId, currentUserId]);

    let pendingWorks = { rows: [] };
    if (req.session.user && req.session.user.id === parseInt(userId, 10)) {
      pendingWorks = await db.query(`
        SELECT w.*,
               COALESCE(
                 ARRAY_AGG(DISTINCT wi.image_url) FILTER (
                   WHERE wi.image_url IS NOT NULL AND BTRIM(wi.image_url) <> ''
                 ),
                 ARRAY[]::text[]
               ) as images,
               COALESCE(
                 ARRAY_AGG(DISTINCT c.name ORDER BY c.name) FILTER (
                   WHERE c.name IS NOT NULL
                 ),
                 ARRAY[]::text[]
               ) as categories
        FROM works w
        LEFT JOIN work_images wi ON w.id = wi.work_id
        LEFT JOIN work_categories wc ON w.id = wc.work_id
        LEFT JOIN categories c ON wc.category_id = c.id
        WHERE w.user_id = $1 AND w.status = 'pending'
        GROUP BY w.id
        ORDER BY w.created_at DESC
      `, [userId]);
    }
    
    // Получаем подписчиков
    const followers = await db.query(`
      SELECT COUNT(*) as count FROM subscriptions WHERE followed_id = $1
    `, [userId]);
    
    // Проверяем, подписан ли текущий пользователь
    let isSubscribed = false;
    if (req.session.user && req.session.user.id !== parseInt(userId)) {
      const subResult = await db.query(`
        SELECT EXISTS(SELECT 1 FROM subscriptions WHERE follower_id = $1 AND followed_id = $2)
      `, [req.session.user.id, userId]);
      isSubscribed = subResult.rows[0].exists;
    }

    res.render('profile', {
      profileUser: user,
      works: works.rows,
      pendingWorks: pendingWorks.rows,
      followersCount: followers.rows[0].count,
      isSubscribed,
      isOwnProfile: req.session.user && req.session.user.id === parseInt(userId),
      profileUpdated: req.query.profile_updated === '1',
      workCreated: req.query.work_created === '1',
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Ошибка загрузки профиля');
  }
};

const getCreateWorkPage = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth');
  }

  try {
    const categories = await db.query(`
      SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name
    `);

    const subcategories = await db.query(`
      SELECT * FROM categories WHERE parent_id IS NOT NULL ORDER BY name
    `);

    res.render('create-work', {
      categories: categories.rows,
      subcategories: subcategories.rows,
    });
  } catch (error) {
    console.error('Error loading create work page:', error);
    res.status(500).send('Ошибка загрузки страницы создания работы');
  }
};

const getWorkPage = async (req, res) => {
  const workId = parseInt(req.params.id, 10);

  if (!Number.isInteger(workId) || workId <= 0) {
    return res.status(404).send('Работа не найдена');
  }

  try {
    const workResult = await db.query(`
      SELECT
        w.*,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.avatar,
        COALESCE((
          SELECT ARRAY_AGG(wi.image_url ORDER BY COALESCE(wi.sort_order, 0), wi.id)
          FROM work_images wi
          WHERE wi.work_id = w.id
            AND wi.image_url IS NOT NULL
            AND BTRIM(wi.image_url) <> ''
        ), ARRAY[]::text[]) AS images,
        COALESCE((
          SELECT ARRAY_AGG(DISTINCT c.name ORDER BY c.name)
          FROM work_categories wc
          JOIN categories c ON c.id = wc.category_id
          WHERE wc.work_id = w.id
            AND c.name IS NOT NULL
        ), ARRAY[]::text[]) AS categories
      FROM works w
      JOIN users u ON u.id = w.user_id
      WHERE w.id = $1
        AND (
          w.status = 'active'
          OR (w.status = 'pending' AND $2::int = w.user_id)
        )
      LIMIT 1
    `, [workId, req.session.user?.id || null]);

    if (workResult.rows.length === 0) {
      return res.status(404).send('Работа не найдена');
    }

    res.render('work', {
      work: workResult.rows[0],
    });
  } catch (error) {
    console.error('Error loading work page:', error);
    res.status(500).send('Ошибка загрузки работы');
  }
};

module.exports = {
  getIndexPage,
  getLentaPage,
  getProfilePage,
  getCreateWorkPage,
  getWorkPage,
};
