require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/font', express.static(path.join(__dirname, 'font')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'liniti_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth?error=Сначала войдите в аккаунт');
  }
  next();
};

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/index.html', (req, res) => {
  res.redirect('/');
});

app.get('/auth', (req, res) => {
  if (req.session.user) {
    return res.redirect('/lenta_new.html');
  }
  res.render('auth', {
    error: req.query.error || '',
    success: req.query.success || '',
    mode: req.query.mode || 'login',
  });
});

app.get('/aut.html', (req, res) => {
  res.redirect('/auth');
});

app.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, confirm_password } = req.body;

  if (!first_name || !last_name || !email || !password || !confirm_password) {
    return res.redirect('/auth?mode=register&error=Заполните все поля');
  }

  if (password !== confirm_password) {
    return res.redirect('/auth?mode=register&error=Пароли не совпадают');
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.redirect('/auth?mode=register&error=Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4, 2)
       RETURNING id, first_name, last_name, email`,
      [first_name, last_name, email, passwordHash]
    );

    const user = created.rows[0];
    req.session.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    };

    return res.redirect('/lenta_new.html');
  } catch (error) {
    console.error('Register error:', error);
    return res.redirect('/auth?mode=register&error=Ошибка при регистрации');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect('/auth?error=Введите email и пароль');
  }

  try {
    const result = await db.query(
      'SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.redirect('/auth?error=Неверный email или пароль');
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.redirect('/auth?error=Неверный email или пароль');
    }

    req.session.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    };

    return res.redirect('/lenta_new.html');
  } catch (error) {
    console.error('Login error:', error);
    return res.redirect('/auth?error=Ошибка при входе');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth?success=Вы вышли из аккаунта');
  });
});

app.get('/lenta_new.html', requireAuth, (req, res) => {
  res.render('lenta_new');
});

app.get('/lenta_new', requireAuth, (req, res) => {
  res.redirect('/lenta_new.html');
});

app.use((req, res) => {
  res.status(404).send('Страница не найдена');
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
