import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

const dbPath = path.resolve('data.db');
const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

// ==========================================
// Schema Setup
// ==========================================
const initDb = () => {
  // Users Table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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

  try {
    db.exec(`ALTER TABLE comments ADD COLUMN sentiment TEXT DEFAULT 'neutral';`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE articles ADD COLUMN location TEXT;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE articles ADD COLUMN mediaType TEXT DEFAULT 'standard';`);
  } catch (e) {}

  // Daily Traffic Analytics Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_traffic (
      date TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 0,
      newUsers INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Notifications Table
  db.exec(`
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
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    console.log("Database is empty. Seeding initial data...");
    
    // Create initial admin user
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, interests, savedArticles, notificationsEnabled, registeredAt)
      VALUES (@id, @username, @email, @password_hash, @role, @interests, @savedArticles, @notificationsEnabled, @registeredAt)
    `);
    
    const defaultPassword = 'password123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    insertUser.run({
      id: 'user-1',
      username: 'admin_editor',
      email: 'editor@marathifastnews.com',
      password_hash: hash,
      role: 'admin',
      interests: JSON.stringify(["Technology", "Science", "Business"]),
      savedArticles: JSON.stringify(["art-1", "art-3"]),
      notificationsEnabled: 1,
      registeredAt: "2026-01-15T08:00:00Z"
    });

    insertUser.run({
      id: 'user-2',
      username: 'alex_reader',
      email: 'alex@example.com',
      password_hash: hash, // Same default password for testing
      role: 'user',
      interests: JSON.stringify(["Politics", "Sports", "Entertainment"]),
      savedArticles: JSON.stringify(["art-2"]),
      notificationsEnabled: 1,
      registeredAt: "2026-03-10T12:30:00Z"
    });

  }
};

initDb();

export default db;
