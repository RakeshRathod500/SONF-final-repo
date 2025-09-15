// db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool, Client } = pkg;

const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASS || "1234";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || "sonf_db";


// Expected schema definition
const expectedSchema = {
  users: [
    { column: "id", type: "integer" },
    { column: "email", type: "text" },
    { column: "password_hash", type: "text" },
    { column: "full_name", type: "text" },
    { column: "username", type: "text" },
    { column: "created_at", type: "timestamp without time zone" },
    { column: "first_name", type: "text" },
    { column: "last_name", type: "text" },
    { column: "dob", type: "date" },
    { column: "country_code", type: "text" },
    { column: "phone", type: "text" },
    { column: "username_ref", type: "text" },
    { column: "referral_code", type: "character varying" }
  ],
  wallets: [
    { column: "id", type: "integer" },
    { column: "user_id", type: "integer" },
    { column: "total_mined", type: "numeric" },
    { column: "available_coins", type: "numeric" },
    { column: "migrated_coins", type: "numeric" },
    { column: "updated_at", type: "timestamp without time zone" },
    { column: "created_at", type: "timestamp without time zone" }
  ],
  mining_sessions: [
    { column: "id", type: "integer" },
    { column: "user_id", type: "integer" },
    { column: "started_at", type: "timestamp without time zone" },
    { column: "ended_at", type: "timestamp without time zone" },
    { column: "total_mined", type: "numeric" }
  ],
  refresh_tokens: [
    { column: "id", type: "integer" },
    { column: "user_id", type: "integer" },
    { column: "token", type: "text" },
    { column: "issued_at", type: "timestamp without time zone" },
    { column: "revoked", type: "boolean" }
  ],
  earn_rewards: [
    { column: "id", type: "integer" },
    { column: "user_id", type: "integer" },
    { column: "platform", type: "text" },
    { column: "reward_amount", type: "numeric" },
    { column: "link", type: "text" },
    { column: "claimed", type: "boolean" },
    { column: "awarded_at", type: "timestamp without time zone" }
  ],
  referrals: [
    { column: "id", type: "integer" },
    { column: "referrer_id", type: "integer" },
    { column: "referee_id", type: "integer" },
    { column: "reward_awarded", type: "boolean" },
    { column: "created_at", type: "timestamp without time zone" }
  ]
};

// 1️⃣ Ensure database exists
async function createDatabaseIfNotExists() {
  const client = new Client({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: DB_PORT,
    database: "postgres",
    ssl: DB_HOST !== "localhost" ? { rejectUnauthorized: false } : false, // SSL for RDS
  });

  await client.connect();
  const res = await client.query(`SELECT 1 FROM pg_database WHERE datname=$1`, [DB_NAME]);

  if (res.rowCount === 0) {
    console.log(`📦 Database "${DB_NAME}" not found. Creating...`);
    await client.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`✅ Database "${DB_NAME}" created`);
  }

  await client.end();
}

// 2️⃣ Check schema of a table
async function checkSchema(pool, table, expectedCols) {
  const res = await pool.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`,
    [table]
  );

  const actualCols = res.rows.map(r => ({ column: r.column_name, type: r.data_type }));

  const missingCols = expectedCols.filter(
    exp => !actualCols.some(act => act.column === exp.column)
  );

  const typeMismatch = expectedCols.filter(exp =>
    actualCols.some(act => act.column === exp.column && act.type !== exp.type)
  );

  return { missingCols, typeMismatch };
}

// 3️⃣ Ensure schema of all tables
async function ensureSchema(pool) {
  for (const [table, cols] of Object.entries(expectedSchema)) {
    const existsRes = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [table]
    );

    if (existsRes.rowCount === 0) {
      console.log(`🆕 Table "${table}" missing. Creating...`);
      await createTable(pool, table);
      continue;
    }

    const { missingCols, typeMismatch } = await checkSchema(pool, table, cols);
    if (missingCols.length > 0 || typeMismatch.length > 0) {
      console.log(`⚠️ Schema mismatch in "${table}"`);
      for (const col of missingCols) {
        console.log(`  ➕ Adding column "${col.column}" (${col.type})`);
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col.column} ${col.type}`);
      }
      for (const col of typeMismatch) {
        console.log(`  ⚠️ Column "${col.column}" has wrong type, expected ${col.type}`);
        if (table === "users" && col.column === "referral_code") {
          await pool.query(`ALTER TABLE users ALTER COLUMN referral_code TYPE VARCHAR(20)`);
        }
      }
    } else {
      console.log(`✅ Table "${table}" schema is correct`);
    }
  }

  // Trigger for wallets.updated_at
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_wallets_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS set_wallets_updated_at ON wallets;
    CREATE TRIGGER set_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_wallets_updated_at();
  `);
}

// 4️⃣ Create tables
async function createTable(pool, table) {
  const queries = {
    users: `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        username TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        first_name TEXT,
        last_name TEXT,
        dob DATE,
        country_code TEXT,
        phone TEXT,
        username_ref TEXT,
        referral_code VARCHAR(20) UNIQUE
      );
    `,
    wallets: `
      CREATE TABLE wallets (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        total_mined NUMERIC DEFAULT 0,
        available_coins NUMERIC DEFAULT 0,
        migrated_coins NUMERIC DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `,
    mining_sessions: `
      CREATE TABLE mining_sessions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMP,
        total_mined NUMERIC DEFAULT 0
      );
    `,
    refresh_tokens: `
      CREATE TABLE refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        issued_at TIMESTAMP DEFAULT NOW(),
        revoked BOOLEAN DEFAULT FALSE
      );
    `,
    earn_rewards: `
      CREATE TABLE earn_rewards (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        reward_amount NUMERIC NOT NULL,
        link TEXT,
        claimed BOOLEAN DEFAULT TRUE,
        awarded_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT earn_rewards_user_id_platform_key UNIQUE (user_id, platform)
      );
    `,
    referrals: `
      CREATE TABLE referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INT REFERENCES users(id) ON DELETE CASCADE,
        referee_id INT REFERENCES users(id) ON DELETE CASCADE,
        reward_awarded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_referral UNIQUE (referrer_id, referee_id)
      );
    `
  };

  if (queries[table]) {
    await pool.query(queries[table]);
    console.log(`✅ Table "${table}" created`);
  }
}

// 5️⃣ Initialize database
let pool;
async function initDb() {
  await createDatabaseIfNotExists();

  pool = new Pool({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: DB_HOST !== "localhost" ? { rejectUnauthorized: false } : false, // SSL for RDS
  });

  await ensureSchema(pool);
  console.log("✅ Database ready with schema checks and triggers");

  return pool;
}

const poolPromise = initDb();
export default poolPromise;
