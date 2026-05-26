import { createClient } from "@libsql/client";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

if (!url || !authToken) {
  console.error("CRITICAL ERROR: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing!");
}

const db = createClient({
  url,
  authToken,
});

// ==========================================
// Schema Setup
// ==========================================
export const initDb = async () => {
  // Users Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      interests TEXT NOT NULL DEFAULT '[]',
      savedArticles TEXT NOT NULL DEFAULT '[]',
      notificationsEnabled INTEGER NOT NULL DEFAULT 1,
      registeredAt TEXT NOT NULL
    );
  `);

  // Articles Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      category TEXT NOT NULL,
      source TEXT NOT NULL,
      imageUrl TEXT,
      publishedAt TEXT NOT NULL,
      author TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      isBreaking INTEGER NOT NULL DEFAULT 0,
      videoUrl TEXT,
      location TEXT,
      mediaType TEXT DEFAULT 'standard',
      commentsCount INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Comments Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      articleId TEXT NOT NULL,
      userId TEXT NOT NULL,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      sentiment TEXT DEFAULT 'neutral',
      FOREIGN KEY(articleId) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try { await db.execute(`ALTER TABLE comments ADD COLUMN sentiment TEXT DEFAULT 'neutral';`); } catch (e) {}
  try { await db.execute(`ALTER TABLE articles ADD COLUMN location TEXT;`); } catch (e) {}
  try { await db.execute(`ALTER TABLE articles ADD COLUMN mediaType TEXT DEFAULT 'standard';`); } catch (e) {}

  // Daily Traffic Analytics Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_traffic (
      date TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 0,
      newUsers INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Notifications Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      articleId TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // Seed Data if tables are empty
  const userCount = await db.execute('SELECT COUNT(*) as count FROM users');
  const count = Number(userCount.rows[0].count);
  
  if (count === 0) {
    console.log("Database is empty. Seeding initial data...");
    
    const defaultPassword = 'password123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    await db.execute({
      sql: `INSERT INTO users (id, username, email, password_hash, role, interests, savedArticles, notificationsEnabled, registeredAt)
      VALUES (@id, @username, @email, @password_hash, @role, @interests, @savedArticles, @notificationsEnabled, @registeredAt)`,
      args: {
        id: 'user-1',
        username: 'admin_editor',
        email: 'editor@marathifastnews.com',
        password_hash: hash,
        role: 'admin',
        interests: JSON.stringify(["Technology", "Science", "Business"]),
        savedArticles: JSON.stringify(["art-1", "art-3"]),
        notificationsEnabled: 1,
        registeredAt: "2026-01-15T08:00:00Z"
      }
    });

    await db.execute({
      sql: `INSERT INTO users (id, username, email, password_hash, role, interests, savedArticles, notificationsEnabled, registeredAt)
      VALUES (@id, @username, @email, @password_hash, @role, @interests, @savedArticles, @notificationsEnabled, @registeredAt)`,
      args: {
        id: 'user-2',
        username: 'alex_reader',
        email: 'alex@example.com',
        password_hash: hash,
        role: 'user',
        interests: JSON.stringify(["Politics", "Sports", "Entertainment"]),
        savedArticles: JSON.stringify(["art-2"]),
        notificationsEnabled: 1,
        registeredAt: "2026-03-10T12:30:00Z"
      }
    });
  }
};

const dbWrapper = {
  prepare: (sql: string) => {
    return {
      run: async (...args: any[]) => {
        const normalizedArgs = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]) ? args[0] : args;
        const res = await db.execute({ sql, args: normalizedArgs });
        return {
          changes: res.rowsAffected,
          lastInsertRowid: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0
        };
      },
      get: async (...args: any[]) => {
        const normalizedArgs = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]) ? args[0] : args;
        return (await db.execute({ sql, args: normalizedArgs })).rows[0];
      },
      all: async (...args: any[]) => {
        const normalizedArgs = args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0]) ? args[0] : args;
        return (await db.execute({ sql, args: normalizedArgs })).rows;
      }
    };
  },
  execute: async (sql: string) => await db.execute(sql),
  executeMultiple: async (sql: string) => await db.executeMultiple(sql),
};

export default dbWrapper;
