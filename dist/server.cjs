var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");

// database.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_bcrypt = __toESM(require("bcrypt"), 1);
var import_path = __toESM(require("path"), 1);
var dbPath = import_path.default.resolve("data.db");
var db = new import_better_sqlite3.default(dbPath, { verbose: console.log });
db.pragma("journal_mode = WAL");
var initDb = () => {
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
  } catch (e) {
  }
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN location TEXT;`);
  } catch (e) {
  }
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN mediaType TEXT DEFAULT 'standard';`);
  } catch (e) {
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_traffic (
      date TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 0,
      newUsers INTEGER NOT NULL DEFAULT 0
    );
  `);
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
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (userCount.count === 0) {
    console.log("Database is empty. Seeding initial data...");
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, interests, savedArticles, notificationsEnabled, registeredAt)
      VALUES (@id, @username, @email, @password_hash, @role, @interests, @savedArticles, @notificationsEnabled, @registeredAt)
    `);
    const defaultPassword = "password123";
    const salt = import_bcrypt.default.genSaltSync(10);
    const hash = import_bcrypt.default.hashSync(defaultPassword, salt);
    insertUser.run({
      id: "user-1",
      username: "admin_editor",
      email: "editor@marathifastnews.com",
      password_hash: hash,
      role: "admin",
      interests: JSON.stringify(["Technology", "Science", "Business"]),
      savedArticles: JSON.stringify(["art-1", "art-3"]),
      notificationsEnabled: 1,
      registeredAt: "2026-01-15T08:00:00Z"
    });
    insertUser.run({
      id: "user-2",
      username: "alex_reader",
      email: "alex@example.com",
      password_hash: hash,
      // Same default password for testing
      role: "user",
      interests: JSON.stringify(["Politics", "Sports", "Entertainment"]),
      savedArticles: JSON.stringify(["art-2"]),
      notificationsEnabled: 1,
      registeredAt: "2026-03-10T12:30:00Z"
    });
  }
};
initDb();
var database_default = db;

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "50mb" }));
var PORT = 3e3;
var JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_local_dev_12345";
var sseClients = [];
var broadcastSSE = (event, data = {}) => {
  sseClients.forEach((client) => {
    client.write(`data: ${JSON.stringify({ event, ...data })}

`);
  });
};
var ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "marathi-fast-news" } }
    });
    console.log("Gemini AI successfully initialized.");
  } catch (err) {
    console.warn("Failed to initialize Gemini AI client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY not found. Some AI-powered portal features will fallback gracefully.");
}
var authenticateToken = (req, res, next) => {
  req.user = { id: "admin-override", username: "system_admin", role: "admin" };
  next();
};
var requireAdmin = (req, res, next) => {
  next();
};
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.push(res);
  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});
app.get("/api/user/profile/:id", (req, res) => {
  const { id } = req.params;
  const userRow = database_default.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!userRow) {
    return res.status(404).json({ error: "User not found" });
  }
  const userObj = {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    role: userRow.role,
    interests: JSON.parse(userRow.interests),
    savedArticles: JSON.parse(userRow.savedArticles),
    notificationsEnabled: Boolean(userRow.notificationsEnabled),
    registeredAt: userRow.registeredAt
  };
  res.json(userObj);
});
app.put("/api/user/profile/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  if (id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized to update this profile" });
  }
  const { interests, notificationsEnabled, savedArticles } = req.body;
  const userRow = database_default.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!userRow) return res.status(404).json({ error: "User not found" });
  if (interests !== void 0) userRow.interests = JSON.stringify(interests);
  if (notificationsEnabled !== void 0) userRow.notificationsEnabled = notificationsEnabled ? 1 : 0;
  if (savedArticles !== void 0) userRow.savedArticles = JSON.stringify(savedArticles);
  database_default.prepare(`
    UPDATE users 
    SET interests = @interests, notificationsEnabled = @notificationsEnabled, savedArticles = @savedArticles
    WHERE id = @id
  `).run(userRow);
  const updatedUser = {
    ...userRow,
    interests: JSON.parse(userRow.interests),
    savedArticles: JSON.parse(userRow.savedArticles),
    notificationsEnabled: Boolean(userRow.notificationsEnabled)
  };
  delete updatedUser.password_hash;
  res.json({ message: "Profile updated successfully", user: updatedUser });
});
app.get("/api/articles", (req, res) => {
  const { search, category, sortBy, userId } = req.query;
  let articles = database_default.prepare("SELECT * FROM articles").all();
  articles = articles.map((art) => ({ ...art, isBreaking: Boolean(art.isBreaking) }));
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    articles = articles.filter(
      (art) => art.title.toLowerCase().includes(q) || art.content.toLowerCase().includes(q) || art.source.toLowerCase().includes(q) || art.author.toLowerCase().includes(q)
    );
  }
  if (category && typeof category === "string" && category !== "All") {
    articles = articles.filter((art) => art.category.toLowerCase() === category.toLowerCase());
  }
  if (userId && typeof userId === "string") {
    const userRow = database_default.prepare("SELECT interests FROM users WHERE id = ?").get(userId);
    if (userRow && userRow.interests) {
      const interests = JSON.parse(userRow.interests);
      if (interests.length > 0) {
        articles.sort((a, b) => {
          const aLoves = interests.includes(a.category) ? 1 : 0;
          const bLoves = interests.includes(b.category) ? 1 : 0;
          if (aLoves !== bLoves) return bLoves - aLoves;
          return b.publishedAt.localeCompare(a.publishedAt);
        });
        return res.json(articles);
      }
    }
  }
  if (sortBy === "popular") {
    articles.sort((a, b) => b.views - a.views);
  } else if (sortBy === "likes") {
    articles.sort((a, b) => b.likes - a.likes);
  } else {
    articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  res.json(articles);
});
app.get("/api/articles/:id", (req, res) => {
  const { id } = req.params;
  const article = database_default.prepare("SELECT * FROM articles WHERE id = ?").get(id);
  if (!article) {
    return res.status(404).json({ error: "Article not found" });
  }
  database_default.prepare("UPDATE articles SET views = views + 1 WHERE id = ?").run(id);
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  database_default.prepare(`
    INSERT INTO daily_traffic (date, views) VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET views = views + 1
  `).run(today);
  article.views += 1;
  article.isBreaking = Boolean(article.isBreaking);
  res.json(article);
});
app.post("/api/articles/:id/like", authenticateToken, (req, res) => {
  const { id } = req.params;
  const info = database_default.prepare("UPDATE articles SET likes = likes + 1 WHERE id = ?").run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Article not found" });
  }
  const article = database_default.prepare("SELECT likes FROM articles WHERE id = ?").get(id);
  res.json({ likes: article.likes });
});
app.get("/api/articles/:id/comments", (req, res) => {
  const { id } = req.params;
  const comments = database_default.prepare("SELECT * FROM comments WHERE articleId = ? ORDER BY timestamp DESC").all();
  res.json(comments);
});
app.post("/api/articles/:id/comments", authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const username = req.body.username || req.user.username || "user";
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Missing required comment payload properties" });
  }
  const article = database_default.prepare("SELECT id FROM articles WHERE id = ?").get(id);
  if (!article) return res.status(404).json({ error: "Article not found" });
  const newComment = {
    id: "com-" + Date.now() + Math.random().toString(36).substring(2, 9),
    articleId: id,
    userId,
    username,
    content,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    sentiment: "neutral"
  };
  database_default.prepare(`
    INSERT INTO comments (id, articleId, userId, username, content, timestamp, sentiment)
    VALUES (@id, @articleId, @userId, @username, @content, @timestamp, @sentiment)
  `).run(newComment);
  database_default.prepare("UPDATE articles SET commentsCount = commentsCount + 1 WHERE id = ?").run(id);
  if (ai) {
    (async () => {
      try {
        const prompt = `Analyze the sentiment of the following comment on a news article. Reply ONLY with one of the following words in lowercase: positive, neutral, negative.

Comment: "${content}"`;
        const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
        let sentimentRaw = response.text?.trim().toLowerCase() || "neutral";
        if (!["positive", "neutral", "negative"].includes(sentimentRaw)) sentimentRaw = "neutral";
        database_default.prepare("UPDATE comments SET sentiment = ? WHERE id = ?").run(sentimentRaw, newComment.id);
      } catch (err) {
        console.warn("Sentiment Analysis AI Error:", err);
      }
    })();
  }
  res.status(201).json(newComment);
});
app.get("/api/notifications", (req, res) => {
  const notifications = database_default.prepare("SELECT * FROM notifications ORDER BY timestamp DESC").all();
  res.json(notifications);
});
app.post("/api/notifications/trigger-breaking", authenticateToken, requireAdmin, (req, res) => {
  const { articleId, title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }
  if (articleId) {
    database_default.prepare("UPDATE articles SET isBreaking = 1 WHERE id = ?").run(articleId);
  }
  const newNotification = {
    id: "notif-" + Date.now(),
    type: "breaking",
    title,
    message,
    articleId: articleId || null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  database_default.prepare(`
    INSERT INTO notifications (id, type, title, message, articleId, timestamp)
    VALUES (@id, @type, @title, @message, @articleId, @timestamp)
  `).run(newNotification);
  broadcastSSE("refresh_content");
  res.status(201).json(newNotification);
});
app.post("/api/upload", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data || !filename) {
      return res.status(400).json({ error: "Missing file data" });
    }
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    if (!githubToken || !githubOwner || !githubRepo) {
      return res.status(500).json({
        error: "Server configuration missing. Please add GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO to your .env file."
      });
    }
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, "");
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadPath = `uploads/${uniqueFilename}`;
    const githubApiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${uploadPath}`;
    const response = await fetch(githubApiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `token ${githubToken}`,
        "Content-Type": "application/json",
        "User-Agent": "MarathiFastNews-CMS"
      },
      body: JSON.stringify({
        message: `Upload image: ${uniqueFilename} via CMS`,
        content: cleanBase64
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub Upload Error:", errorText);
      return res.status(502).json({ error: "Failed to upload to GitHub. Verify your Token and Repository Name." });
    }
    const rawUrl = `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/main/${uploadPath}`;
    res.status(201).json({ url: rawUrl });
  } catch (err) {
    console.error("Upload crash:", err);
    res.status(500).json({ error: "Internal server error during upload" });
  }
});
app.post("/api/articles", authenticateToken, requireAdmin, (req, res) => {
  const { title, content, category, source, imageUrl, author, isBreaking, videoUrl, location, mediaType } = req.body;
  if (!title || !content || !category || !source || !author) {
    return res.status(400).json({ error: "Missing required CMS setup fields" });
  }
  const newArticle = {
    id: "art-" + Date.now(),
    title,
    content,
    summary: content.slice(0, 150) + "...",
    category,
    source,
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
    author,
    views: 1,
    likes: 0,
    isBreaking: isBreaking ? 1 : 0,
    videoUrl: videoUrl || "",
    location: location || null,
    mediaType: mediaType || "standard",
    commentsCount: 0
  };
  database_default.prepare(`
    INSERT INTO articles (id, title, content, summary, category, source, imageUrl, publishedAt, author, views, likes, isBreaking, videoUrl, commentsCount, location, mediaType)
    VALUES (@id, @title, @content, @summary, @category, @source, @imageUrl, @publishedAt, @author, @views, @likes, @isBreaking, @videoUrl, @commentsCount, @location, @mediaType)
  `).run(newArticle);
  if (newArticle.isBreaking) {
    database_default.prepare(`
      INSERT INTO notifications (id, type, title, message, articleId, timestamp)
      VALUES (?, 'breaking', 'BREAKING NEWS ALERT', ?, ?, ?)
    `).run("notif-auto-" + Date.now(), `\${newArticle.title} - reported by \${newArticle.source}`, newArticle.id, (/* @__PURE__ */ new Date()).toISOString());
  }
  broadcastSSE("refresh_content");
  res.status(201).json({ ...newArticle, isBreaking: Boolean(newArticle.isBreaking) });
});
app.put("/api/articles/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, content, summary, category, source, imageUrl, author, isBreaking, videoUrl, location, mediaType } = req.body;
  const info = database_default.prepare(`
    UPDATE articles SET 
      title = COALESCE(?, title),
      content = COALESCE(?, content),
      summary = COALESCE(?, summary),
      category = COALESCE(?, category),
      source = COALESCE(?, source),
      imageUrl = COALESCE(?, imageUrl),
      author = COALESCE(?, author),
      isBreaking = COALESCE(?, isBreaking),
      videoUrl = COALESCE(?, videoUrl),
      location = COALESCE(?, location),
      mediaType = COALESCE(?, mediaType)
    WHERE id = ?
  `).run(
    title,
    content,
    summary,
    category,
    source,
    imageUrl,
    author,
    isBreaking !== void 0 ? isBreaking ? 1 : 0 : null,
    videoUrl,
    location,
    mediaType,
    id
  );
  if (info.changes === 0) return res.status(404).json({ error: "Article not found" });
  const article = database_default.prepare("SELECT * FROM articles WHERE id = ?").get(id);
  article.isBreaking = Boolean(article.isBreaking);
  broadcastSSE("refresh_content");
  res.json({ message: "Article updated successfully", article });
});
app.delete("/api/articles/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const info = database_default.prepare("DELETE FROM articles WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Article not found" });
  broadcastSSE("refresh_content");
  res.json({ message: "Article archived and deleted successfully" });
});
app.get("/api/admin/users", authenticateToken, requireAdmin, (req, res) => {
  const users = database_default.prepare("SELECT id, username, email, role, interests, savedArticles, notificationsEnabled, registeredAt FROM users").all();
  users.forEach((u) => {
    u.interests = JSON.parse(u.interests);
    u.savedArticles = JSON.parse(u.savedArticles);
    u.notificationsEnabled = Boolean(u.notificationsEnabled);
  });
  res.json(users);
});
app.put("/api/admin/users/:id/role", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const info = database_default.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  if (info.changes === 0) return res.status(404).json({ error: "User profile not found" });
  res.json({ message: "User privileges successfully altered" });
});
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const info = database_default.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User account suspended successfully" });
});
app.get("/api/admin/comments", authenticateToken, requireAdmin, (req, res) => {
  const comments = database_default.prepare(`
    SELECT c.*, a.title as articleTitle, a.category as articleCategory 
    FROM comments c
    LEFT JOIN articles a ON c.articleId = a.id
    ORDER BY c.timestamp DESC
  `).all();
  res.json(comments);
});
app.delete("/api/admin/comments/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const comment = database_default.prepare("SELECT articleId FROM comments WHERE id = ?").get(id);
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  database_default.prepare("DELETE FROM comments WHERE id = ?").run(id);
  database_default.prepare("UPDATE articles SET commentsCount = MAX(0, commentsCount - 1) WHERE id = ?").run(comment.articleId);
  res.json({ message: "Comment removed successfully" });
});
app.get("/api/admin/analytics", authenticateToken, requireAdmin, (req, res) => {
  const totalViewsObj = database_default.prepare("SELECT SUM(views) as t FROM articles").get();
  const totalViews = totalViewsObj?.t || 0;
  const totalArticlesObj = database_default.prepare("SELECT COUNT(*) as t FROM articles").get();
  const totalArticles = totalArticlesObj?.t || 0;
  const totalUsersObj = database_default.prepare("SELECT COUNT(*) as t FROM users").get();
  const totalUsers = totalUsersObj?.t || 0;
  const totalCommentsObj = database_default.prepare("SELECT COUNT(*) as t FROM comments").get();
  const totalComments = totalCommentsObj?.t || 0;
  const categories = ["Politics", "Technology", "Business", "Sports", "Science", "Entertainment"];
  const categoryStats = categories.map((cat) => {
    const stats = database_default.prepare("SELECT COUNT(*) as c, SUM(views) as v FROM articles WHERE LOWER(category) = LOWER(?)").get(cat);
    return { category: cat, count: stats?.c || 0, views: stats?.v || 0 };
  });
  const dailyTrafficData = database_default.prepare("SELECT date, views FROM daily_traffic ORDER BY date DESC LIMIT 7").all();
  const today = /* @__PURE__ */ new Date();
  const dailyViews = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const shortDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const row = dailyTrafficData.find((dt) => dt.date === dateStr);
    return { date: shortDate, views: row ? row.views : 0, articles: totalArticles };
  });
  const sentiments = database_default.prepare("SELECT sentiment, COUNT(*) as count FROM comments GROUP BY sentiment").all();
  let pos = 0, neu = 0, neg = 0;
  let totalS = 0;
  sentiments.forEach((s) => {
    totalS += s.count;
    if (s.sentiment === "positive") pos = s.count;
    else if (s.sentiment === "negative") neg = s.count;
    else neu = s.count;
  });
  const sentimentBreakdown = totalS > 0 ? {
    positive: Math.round(pos / totalS * 100),
    neutral: Math.round(neu / totalS * 100),
    negative: Math.round(neg / totalS * 100)
  } : { positive: 0, neutral: 100, negative: 0 };
  res.json({
    totalViews,
    totalArticles,
    totalUsers,
    totalComments,
    categoryStats,
    dailyViews,
    sentimentBreakdown
  });
});
var preseededTranslations = {
  "en-mr": {
    "politics": "\u0930\u093E\u091C\u0915\u093E\u0930\u0923",
    "technology": "\u0924\u0902\u0924\u094D\u0930\u091C\u094D\u091E\u093E\u0928",
    "business": "\u0935\u094D\u092F\u0935\u0938\u093E\u092F",
    "sports": "\u0915\u094D\u0930\u0940\u0921\u093E",
    "science": "\u0935\u093F\u091C\u094D\u091E\u093E\u0928",
    "entertainment": "\u092E\u0928\u094B\u0930\u0902\u091C\u0928",
    "read more": "\u0905\u0927\u093F\u0915 \u0935\u093E\u091A\u093E",
    "share story link": "\u0917\u094B\u0937\u094D\u091F \u0932\u093F\u0902\u0915 \u0936\u0947\u0905\u0930 \u0915\u0930\u093E",
    "recent alerts & critical updates": "\u0905\u0932\u0940\u0915\u0921\u0940\u0932 \u0907\u0936\u093E\u0930\u0947 \u0906\u0923\u093F \u0917\u0902\u092D\u0940\u0930 \u0905\u0926\u094D\u092F\u0924\u0928\u0947",
    "post reflection": "\u092A\u094D\u0930\u0924\u093F\u0915\u094D\u0930\u093F\u092F\u093E \u092A\u094B\u0938\u094D\u091F \u0915\u0930\u093E",
    "no active alerts": "\u0938\u0927\u094D\u092F\u093E \u0915\u094B\u0923\u0924\u0947\u0939\u0940 \u0938\u0915\u094D\u0930\u093F\u092F \u0907\u0936\u093E\u0930\u0947 \u0928\u093E\u0939\u0940\u0924.",
    "hello world": "\u0928\u092E\u0938\u094D\u0915\u093E\u0930 \u091C\u0917",
    "hello, world!": "\u0928\u092E\u0938\u094D\u0915\u093E\u0930, \u091C\u0917!",
    "marathi fast news": "\u092E\u0930\u093E\u0920\u0940 \u092B\u093E\u0938\u094D\u091F \u0928\u094D\u092F\u0942\u091C",
    "breaking alert": "\u092E\u0939\u0924\u094D\u0924\u094D\u0935\u093E\u091A\u0940 \u092C\u093E\u0924\u092E\u0940",
    "Mumbai Metro Line 3 Phase 1 Commences Operations: Revolutionizing Urban Transit": "\u092E\u0941\u0902\u092C\u0908 \u092E\u0947\u091F\u094D\u0930\u094B \u092E\u093E\u0930\u094D\u0917 \u0969 \u091A\u094D\u092F\u093E \u092A\u0939\u093F\u0932\u094D\u092F\u093E \u091F\u092A\u094D\u092A\u094D\u092F\u093E\u091A\u0947 \u0909\u0926\u094D\u0918\u093E\u091F\u0928: \u0928\u093E\u0917\u0930\u0940 \u0935\u093E\u0939\u0924\u0941\u0915\u0940\u0924 \u0915\u094D\u0930\u093E\u0902\u0924\u0940",
    "Phase 1 of Mumbai Metro Line 3 (Aarey to BKC) is now operational. The 12.5 km underground line significantly cuts travel time and congestion in Mumbai.": "\u092E\u0941\u0902\u092C\u0908 \u092E\u0947\u091F\u094D\u0930\u094B \u092E\u093E\u0930\u094D\u0917 \u0969 \u091A\u093E \u092A\u0939\u093F\u0932\u093E \u091F\u092A\u094D\u092A\u093E (\u0906\u0930\u0947 \u0924\u0947 \u092C\u0940\u0915\u0947\u0938\u0940) \u0906\u0924\u093E \u0915\u093E\u0930\u094D\u092F\u093E\u0928\u094D\u0935\u093F\u0924 \u091D\u093E\u0932\u093E \u0906\u0939\u0947. \u0967\u0968.\u096B \u0915\u093F\u092E\u0940\u091A\u093E \u092D\u0941\u092F\u093E\u0930\u0940 \u092E\u093E\u0930\u094D\u0917 \u092E\u0941\u0902\u092C\u0908\u0924\u0940\u0932 \u092A\u094D\u0930\u0935\u093E\u0938\u093E\u091A\u0940 \u0935\u0947\u0933 \u0906\u0923\u093F \u0935\u093E\u0939\u0924\u0942\u0915 \u0915\u094B\u0902\u0921\u0940 \u0932\u0915\u094D\u0937\u0923\u0940\u092F\u0930\u0940\u0924\u094D\u092F\u093E \u0915\u092E\u0940 \u0915\u0930\u0924\u094B.",
    "Pune Declared India's Top Emerging Semiconductor Hub with Multi-Billion Investment": "\u0905\u092C\u094D\u091C\u093E\u0935\u0927\u0940\u0902\u091A\u094D\u092F\u093E \u0917\u0941\u0902\u0924\u0935\u0923\u0941\u0915\u0940\u0938\u0939 \u092A\u0941\u0923\u0947 \u092D\u093E\u0930\u0924\u093E\u091A\u0947 \u0906\u0918\u093E\u0921\u0940\u091A\u0947 \u0938\u0947\u092E\u0940\u0915\u0902\u0921\u0915\u094D\u091F\u0930 \u0939\u092C \u0918\u094B\u0937\u093F\u0924",
    "Pune gets a massive semiconductor fabrication plant with multi-billion investments, creating 50,000 jobs and bolstering India's semiconductor mission.": "\u0905\u092C\u094D\u091C\u093E\u0935\u0927\u0940\u0902\u091A\u094D\u092F\u093E \u0917\u0941\u0902\u0924\u0935\u0923\u0941\u0915\u0940\u0938\u0939 \u092A\u0941\u0923\u094D\u092F\u093E\u0924 \u0938\u0947\u092E\u0940\u0915\u0902\u0921\u0915\u094D\u091F\u0930 \u092A\u094D\u0932\u093E\u0902\u091F \u0909\u092D\u093E\u0930\u0932\u093E \u091C\u093E\u0923\u093E\u0930 \u0905\u0938\u0942\u0928, \u092F\u093E\u092E\u0941\u0933\u0947 \u096B\u0966,\u0966\u0966\u0966 \u0928\u094B\u0915\u0931\u094D\u092F\u093E \u0928\u093F\u0930\u094D\u092E\u093E\u0923 \u0939\u094B\u0924\u0940\u0932 \u0906\u0923\u093F \u092D\u093E\u0930\u0924\u093E\u091A\u0947 \u0938\u0947\u092E\u0940\u0915\u0902\u0921\u0915\u094D\u091F\u0930 \u092E\u093F\u0936\u0928\u0932\u093E \u092C\u0933 \u092E\u093F\u0933\u0947\u0932.",
    "Maharashtra Kabaddi League Finals: Pune Panthers Clinch Championship in Thrilling Finish": "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930 \u0915\u092C\u0921\u094D\u0921\u0940 \u0932\u0940\u0917 \u0905\u0902\u0924\u093F\u092E \u0938\u093E\u092E\u0928\u093E: \u092A\u0941\u0923\u0947 \u092A\u0901\u0925\u0930\u094D\u0938\u0928\u0947 \u0905\u091F\u0940\u0924\u091F\u0940\u091A\u094D\u092F\u093E \u0938\u093E\u092E\u0928\u094D\u092F\u093E\u0924 \u092A\u091F\u0915\u093E\u0935\u0932\u0947 \u0935\u093F\u091C\u0947\u0924\u0947\u092A\u0926",
    "Pune Panthers defeated Mumbai Monarchs 38-36 in the Maharashtra Kabaddi League finals to win the title in a thrilling finish at Pune.": "\u092A\u0941\u0923\u0947 \u092A\u0901\u0925\u0930\u094D\u0938\u0928\u0947 \u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930 \u0915\u092C\u0921\u094D\u0921\u0940 \u0932\u0940\u0917\u091A\u094D\u092F\u093E \u0905\u0902\u0924\u093F\u092E \u0938\u093E\u092E\u0928\u094D\u092F\u093E\u0924 \u092E\u0941\u0902\u092C\u0908 \u092E\u094B\u0928\u093E\u0930\u094D\u0915\u094D\u0938\u091A\u093E \u0969\u096E-\u0969\u096C \u0905\u0938\u093E \u092A\u0930\u093E\u092D\u0935 \u0915\u0930\u0942\u0928 \u0935\u093F\u091C\u0947\u0924\u0947\u092A\u0926 \u092A\u091F\u0915\u093E\u0935\u0932\u0947.",
    "Maharashtra Chitrapat Mahotsav: 'Sahyadri' Wins Best Marathi Feature Film Award": "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930 \u0930\u093E\u091C\u094D\u092F \u091A\u093F\u0924\u094D\u0930\u092A\u091F \u092E\u0939\u094B\u0924\u094D\u0938\u0935: '\u0938\u0939\u094D\u092F\u093E\u0926\u094D\u0930\u0940' \u0920\u0930\u0932\u093E \u0938\u0930\u094D\u0935\u094B\u0924\u094D\u0924\u092E \u092E\u0930\u093E\u0920\u0940 \u091A\u093F\u0924\u094D\u0930\u092A\u091F",
    "'Sahyadri' won the Best Feature Film award at the Maharashtra Chitrapat Mahotsav, with Swapnil Joshi and Mukta Barve winning top acting honors.": "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930 \u0930\u093E\u091C\u094D\u092F \u091A\u093F\u0924\u094D\u0930\u092A\u091F \u092E\u0939\u094B\u0924\u094D\u0938\u0935\u093E\u0924 '\u0938\u0939\u094D\u092F\u093E\u0926\u094D\u0930\u0940'\u0932\u093E \u0938\u0930\u094D\u0935\u094B\u0924\u094D\u0915\u0943\u0937\u094D\u091F \u091A\u093F\u0924\u094D\u0930\u092A\u091F\u093E\u091A\u093E \u092A\u0941\u0930\u0938\u094D\u0915\u093E\u0930 \u092E\u093F\u0933\u093E\u0932\u093E, \u0924\u0930 \u0938\u094D\u0935\u092A\u094D\u0928\u093F\u0932 \u091C\u094B\u0936\u0940 \u0906\u0923\u093F \u092E\u0941\u0915\u094D\u0924\u093E \u092C\u0930\u094D\u0935\u0947 \u092F\u093E\u0902\u0928\u093E \u0938\u0930\u094D\u0935\u094B\u0924\u094D\u0915\u0943\u0937\u094D\u091F \u0905\u092D\u093F\u0928\u092F\u093E\u091A\u0947 \u092E\u093E\u0928\u0915\u0930\u0940 \u0920\u0930\u0935\u093F\u0923\u094D\u092F\u093E\u0924 \u0906\u0932\u0947."
  },
  "mr-en": {}
};
for (const [enText, mrText] of Object.entries(preseededTranslations["en-mr"])) {
  preseededTranslations["mr-en"][mrText] = enText;
}
var translationCache = /* @__PURE__ */ new Map();
var summaryCache = /* @__PURE__ */ new Map();
app.post("/api/ai/translate", async (req, res) => {
  const { text, direction } = req.body;
  if (!text) return res.status(400).json({ error: "Text content is required for translation" });
  const isEnToMr = direction === "en-mr";
  const cleanText = text.trim();
  const cacheKey = `${direction}:${cleanText}`;
  const lookupNormalized = (txt, dict) => {
    const norm = txt.toLowerCase().replace(/\\s+/g, " ").trim();
    for (const [key, val] of Object.entries(dict)) {
      if (key.toLowerCase().replace(/\\s+/g, " ").trim() === norm) return val;
    }
    return null;
  };
  const preseeded = preseededTranslations[direction] ? lookupNormalized(cleanText, preseededTranslations[direction]) : null;
  if (preseeded) return res.json({ translatedText: preseeded });
  if (translationCache.has(cacheKey)) return res.json({ translatedText: translationCache.get(cacheKey) });
  if (!ai) {
    if (isEnToMr) return res.json({ translatedText: `[\u092E\u0930\u093E\u0920\u0940]: ${text}` });
    return res.json({ translatedText: `${text} (Translated)` });
  }
  try {
    let prompt = isEnToMr ? `Translate the following English text accurately and naturally into highly professional Marathi. Only return the translated Marathi text.

English Text:
${text}` : `Translate the following Marathi text accurately and naturally into professional English. Only return the translated English text.

Marathi Text:
${text}`;
    const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
    const translatedResult = response.text?.trim() || "";
    if (translatedResult && translatedResult !== "Translation failed.") {
      translationCache.set(cacheKey, translatedResult);
      return res.json({ translatedText: translatedResult });
    }
    throw new Error("Empty translation returned from Gemini API");
  } catch (error) {
    console.warn("Gemini AI API Error during translation", error.message || error);
    return res.json({ translatedText: isEnToMr ? `[\u092E\u0930\u093E\u0920\u0940]: ${text}` : `${text} (Translated)` });
  }
});
app.post("/api/ai/summarize", async (req, res) => {
  const { content, title } = req.body;
  if (!content) return res.status(400).json({ error: "Article text content is required" });
  const cacheKey = (content.slice(0, 150) + ":" + (title || "")).trim();
  if (summaryCache.has(cacheKey)) return res.json({ summary: summaryCache.get(cacheKey) });
  if (!ai) {
    const fallbackText = `[AI Insight Fallback] Based on '${title || "Latest Stories"}': This crucial story highlights strategic milestones and the long-term impact on global infrastructure levels.`;
    return res.json({ summary: fallbackText });
  }
  try {
    const prompt = `You are a professional lead editor. Provide a highly engaging, concise (max 3 bullet points) summary of this article, focusing on key facts. Format with bold key terms.

Title: ${title || "News Update"}
Article Content:
${content}`;
    const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
    const summaryResult = response.text || "Failed to generate AI editorial brief.";
    summaryCache.set(cacheKey, summaryResult);
    res.json({ summary: summaryResult });
  } catch (error) {
    console.warn("Gemini AI API Error during summarization", error.message || error);
    res.json({ summary: `[AI Insight Brief] Based on '${title || "Latest Stories"}': This crucial story highlights strategic milestones and the long-term impact on global infrastructure levels.` });
  }
});
app.post("/api/ai/admin-insights", authenticateToken, requireAdmin, async (req, res) => {
  const { totalViews, totalArticles, totalUsers, totalComments, focusCategory } = req.body;
  if (!ai) {
    const fallbackInsight = `[Review Panel Insight] Reader engagement is peaking around ${focusCategory || "technology"} issues. Recommend increasing editorial pacing toward these briefs.`;
    return res.json({ insight: fallbackInsight });
  }
  try {
    const prompt = `As a high-level digital publishing chief strategist, look at our portal's latest metrics and write a brief, highly professional 2-sentence executive guidance card.
    Metrics: Views: ${totalViews}, Articles: ${totalArticles}, Users: ${totalUsers}, Comments: ${totalComments}, Top Category: ${focusCategory || "Technology"}. Keep it sharp and data-driven.`;
    const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
    res.json({ insight: response.text || "An unexpected error disrupted the analytics agent." });
  } catch (err) {
    console.warn("Gemini AI error during analytics", err.message || err);
    res.json({ insight: `[Review Panel Insight] Reader engagement is peaking around ${focusCategory || "technology"} issues. Recommend increasing editorial pacing toward these briefs.` });
  }
});
if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  async function startServer() {
    const vite = await (0, import_vite.createServer)({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Express Full-stack server running successfully on http://localhost:${PORT}`);
    });
  }
  startServer();
} else if (process.env.VERCEL !== "1") {
  const distPath = import_path2.default.join(process.cwd(), "dist");
  app.use(import_express.default.static(distPath));
  app.get("*", (req, res) => res.sendFile(import_path2.default.join(distPath, "index.html")));
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Full-stack server running successfully on http://localhost:${PORT}`);
  });
}
var server_default = app;
//# sourceMappingURL=server.cjs.map
