import knex from 'knex';
import pg from 'pg';

pg.defaults.ssl = process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false;

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.zrnspwcrbsopkmbalnel',
    password: '1789',
    database: 'postgres'
  },
  pool: { min: 0, max: 15 }
});

export default db;
