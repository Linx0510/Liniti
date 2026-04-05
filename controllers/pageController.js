const db = require('../config/database');

const getIndexPage = async (req, res) => {
  try {
    // Получаем последние работы для демонстрации
    const recentWorks = await db.query(`
      SELECT w.*, u.first_name, u.last_name 
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
        ), FALSE) as is_liked
      FROM works w
      JOIN users u ON w.user_id = u.id
      WHERE w.status = 'active'
      ORDER BY w.created_at DESC
    `, [currentUserId]);
    
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
    });
  } catch (error) {
    console.error('Error loading lenta page:', error);
    res.render('lenta_new', { works: [], categories: [], subcategories: [] });
  }
};

const getProfilePage = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth');
  }
  
  try {
    const userId = req.params.id || req.session.user.id;
    
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
    
    // Получаем работы пользователя
    const works = await db.query(`
      SELECT w.*,
             COALESCE(
               ARRAY_AGG(DISTINCT wi.image_url) FILTER (
                 WHERE wi.image_url IS NOT NULL AND BTRIM(wi.image_url) <> ''
               ),
               ARRAY[]::text[]
             ) as images
      FROM works w
      LEFT JOIN work_images wi ON w.id = wi.work_id
      WHERE w.user_id = $1 AND w.status = 'active'
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `, [userId]);
    
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
      followersCount: followers.rows[0].count,
      isSubscribed,
      isOwnProfile: req.session.user && req.session.user.id === parseInt(userId),
      profileUpdated: req.query.profile_updated === '1',
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

module.exports = {
  getIndexPage,
  getLentaPage,
  getProfilePage,
  getCreateWorkPage,
};
