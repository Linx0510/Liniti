const db = require('../config/database');

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] || null;
};

const createUser = async ({ firstName, lastName, email, passwordHash }) => {
  const result = await db.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
     VALUES ($1, $2, $3, $4, 2)
     RETURNING id, first_name, last_name, email`,
    [firstName, lastName, email, passwordHash]
  );

  return result.rows[0];
};

module.exports = {
  findByEmail,
  createUser,
};
