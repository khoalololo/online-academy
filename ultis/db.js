import knex from 'knex';
import pg from 'pg';

pg.defaults.ssl = process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false;

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres'
  },
  pool: { min: 0, max: 15 }
});

export default db;
