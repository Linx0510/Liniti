require('dotenv').config();

const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres'
});

const TABLES_FROM_SQL = [
  'roles',
  'users',
  'accounts',
  'transactions',
  'subscriptions',
  'categories',
  'services',
  'service_stages',
  'works',
  'work_images',
  'complaint_reasons',
  'complaints',
  'notifications',
  'partnership_requests',
  'feedback',
  'user_reviews',
  'service_reviews',
  'chats',
  'messages',
  'message_drafts',
  'blocked_users'
];

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(__dirname));

async function getTableData(tableName, limit = 10) {
  const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 10;
  const query = `SELECT * FROM ${tableName} ORDER BY 1 DESC LIMIT ${safeLimit}`;
  const result = await pool.query(query);

  return {
    tableName,
    columns: result.fields.map((field) => field.name),
    rows: result.rows
  };
}

app.get('/', async (req, res) => {
  const limit = req.query.limit || 10;
  const data = [];

  for (const table of TABLES_FROM_SQL) {
    try {
      const tableData = await getTableData(table, limit);
      data.push(tableData);
    } catch (error) {
      data.push({
        tableName: table,
        columns: [],
        rows: [],
        error: error.message
      });
    }
  }

  res.render('index', {
    tableDataList: data,
    tableLimit: Math.min(Number(limit) || 10, 100)
  });
});

app.get('/table/:name', async (req, res) => {
  const tableName = req.params.name;
  const limit = req.query.limit || 20;

  if (!TABLES_FROM_SQL.includes(tableName)) {
    return res.status(404).json({
      error: `Table \"${tableName}\" not found in linistok.sql list`
    });
  }

  try {
    const data = await getTableData(tableName, limit);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      tableName,
      error: error.message
    });
  }
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, db: 'disconnected', error: error.message });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
