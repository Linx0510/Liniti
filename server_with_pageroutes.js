require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pageRoutes = require('./routes/pageRoutes');
const { attachCurrentUser, ensureCsrfToken } = require('./middleware/authMiddleware');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'test',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: 'lax' }
}));

app.use(attachCurrentUser);
app.use(ensureCsrfToken);

app.use(pageRoutes);

app.get('/test123', (req, res) => {
  res.send('test123 after pageRoutes');
});

app.use((req, res) => res.status(404).send('Not found'));

app.listen(3008, () => console.log('With pageRoutes on 3008'));
