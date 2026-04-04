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
        COALESCE(ARRAY_AGG(DISTINCT wi.image_url) FILTER (WHERE wi.image_url IS NOT NULL), ARRAY[]::text[]) as images,
        COALESCE(ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), ARRAY[]::text[]) as categories,
        COALESCE(BOOL_OR(wl.user_id = $1), FALSE) as is_liked
      FROM works w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN work_images wi ON w.id = wi.work_id
      LEFT JOIN work_categories wc ON w.id = wc.work_id
      LEFT JOIN categories c ON wc.category_id = c.id
      LEFT JOIN work_likes wl ON wl.work_id = w.id
      WHERE w.status = 'active'
      GROUP BY w.id, u.id, u.first_name, u.last_name, u.avatar
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
      currentUser: req.session.user || null,
    });
  } catch (error) {
    console.error('Error loading lenta page:', error);
    res.render('lenta_new', { works: [], categories: [], subcategories: [], currentUser: req.session.user || null });
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
      SELECT w.*, COALESCE(ARRAY_AGG(DISTINCT wi.image_url) FILTER (WHERE wi.image_url IS NOT NULL), ARRAY[]::text[]) as images
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

    const categories = await db.query(`
      SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name
    `);

    const subcategories = await db.query(`
      SELECT * FROM categories WHERE parent_id IS NOT NULL ORDER BY name
    `);
    
    res.render('profile', {
      profileUser: user,
      works: works.rows,
      followersCount: followers.rows[0].count,
      isSubscribed,
      isOwnProfile: req.session.user && req.session.user.id === parseInt(userId),
      categories: categories.rows,
      subcategories: subcategories.rows,
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Ошибка загрузки профиля');
  }
};

module.exports = {
  getIndexPage,
  getLentaPage,
  getProfilePage,
};
