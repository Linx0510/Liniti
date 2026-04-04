require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const { attachCurrentUser } = require('./middleware/authMiddleware');
const pageRoutes = require('./routes/pageRoutes');
const authRoutes = require('./routes/authRoutes');

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

app.use(attachCurrentUser);

app.use(pageRoutes);
app.use(authRoutes);

app.use((req, res) => {
  res.status(404).send('Страница не найдена');
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
