import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Article, Comment, User, SystemNotification, AnalyticsSummary } from "./src/types";
import db, { initDb } from "./database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

// Auto-initialize Turso database tables on startup
initDb().catch(err => console.error("Database initialization failed:", err));

const app = express();
app.use(express.json({ limit: '50mb' }));
const PORT = Number(process.env.PORT) || 3000;

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_local_dev_12345";

// Server-Sent Events (SSE) active clients list
let sseClients: express.Response[] = [];

const broadcastSSE = (event: string, data: any = {}) => {
  sseClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
  });
};

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'marathi-fast-news' } }
    });
    console.log("Gemini AI successfully initialized.");
  } catch (err) {
    console.warn("Failed to initialize Gemini AI client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY not found. Some AI-powered portal features will fallback gracefully.");
}

// Authentication Middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  // Authentication disabled: inject a dummy admin profile for structural consistency
  req.user = { id: 'admin-override', username: 'system_admin', role: 'admin' };
  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  // Admin requirement bypassed globally per user request
  next();
};

// ==========================================
// Server-Sent Events (SSE) Stream
// ==========================================

app.get("/api/stream", (req: any, res: any) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Establish connection

  sseClients.push(res);

  req.on("close", () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// ==========================================
// User Profile APIs (Auth removed)
// ==========================================

app.get("/api/users/:id", authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!userRow) {
    return res.status(404).json({ error: "User not found" });
  }
  const userObj: User = {
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

app.put("/api/users/:id", authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  
  // Ensure users only update their own profile unless admin
  if (id !== (req as any).user.id && (req as any).user.role !== 'admin') {
    return res.status(403).json({ error: "Not authorized to update this profile" });
  }

  const { interests, notificationsEnabled, savedArticles } = req.body;
  
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!userRow) return res.status(404).json({ error: "User not found" });

  if (interests !== undefined) userRow.interests = JSON.stringify(interests);
  if (notificationsEnabled !== undefined) userRow.notificationsEnabled = notificationsEnabled ? 1 : 0;
  if (savedArticles !== undefined) userRow.savedArticles = JSON.stringify(savedArticles);

  await db.prepare(`
    UPDATE users 
    SET interests = @interests, notificationsEnabled = @notificationsEnabled, savedArticles = @savedArticles
    WHERE id = @id
  `).run(userRow);

  const updatedUser: User = {
    ...userRow,
    interests: JSON.parse(userRow.interests),
    savedArticles: JSON.parse(userRow.savedArticles),
    notificationsEnabled: Boolean(userRow.notificationsEnabled)
  };
  delete (updatedUser as any).password_hash; // Don't leak hash

  res.json({ message: "Profile updated successfully", user: updatedUser });
});

// ==========================================
// Articles & Feed APIs
// ==========================================

app.get("/api/articles", async (req: any, res: any) => {
  const { search, category, sortBy, userId } = req.query;
  
  let articles = await db.prepare('SELECT * FROM articles').all() as any[];
  
  // parse booleans
  articles = articles.map(art => ({ ...art, isBreaking: Boolean(art.isBreaking) }));

  // 1. Search Query Filtration
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    articles = articles.filter(art => 
      art.title.toLowerCase().includes(q) || 
      art.content.toLowerCase().includes(q) || 
      art.source.toLowerCase().includes(q) ||
      art.author.toLowerCase().includes(q)
    );
  }

  // 2. Category Filter
  if (category && typeof category === "string" && category !== "All") {
    articles = articles.filter(art => art.category.toLowerCase() === category.toLowerCase());
  }

  // 3. User personalized feeds sorting sequence
  if (userId && typeof userId === "string") {
    const userRow = await db.prepare('SELECT interests FROM users WHERE id = ?').get(userId) as any;
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

  // 4. Sort Ordering
  if (sortBy === "popular") {
    articles.sort((a, b) => b.views - a.views);
  } else if (sortBy === "likes") {
    articles.sort((a, b) => b.likes - a.likes);
  } else {
    articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  res.json(articles);
});

app.get("/api/articles/:id", async (req: any, res: any) => {
  const { id } = req.params;
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
  if (!article) {
    return res.status(404).json({ error: "Article not found" });
  }

  await db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(id);
  
  const today = new Date().toISOString().split('T')[0];
  await db.prepare(`
    INSERT INTO daily_traffic (date, views) VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET views = views + 1
  `).run(today);

  article.views += 1;
  article.isBreaking = Boolean(article.isBreaking);

  res.json(article);
});

app.post("/api/articles/:id/like", authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const info = await db.prepare('UPDATE articles SET likes = likes + 1 WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Article not found" });
  }
  const article = await db.prepare('SELECT likes FROM articles WHERE id = ?').get(id) as any;
  res.json({ likes: article.likes });
});

// ==========================================
// Commenting System APIs
// ==========================================

app.get("/api/articles/:id/comments", async (req: any, res: any) => {
  const { id } = req.params;
  const comments = await db.prepare('SELECT * FROM comments WHERE articleId = ? ORDER BY timestamp DESC').all(id);
  res.json(comments);
});

app.post("/api/articles/:id/comments", authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  // Fallback to JWT payload if not explicitly sent in body (safer)
  const userId = (req as any).user.id;
  const username = req.body.username || (req as any).user.username || 'user';
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Missing required comment payload properties" });
  }

  const article = await db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
  if (!article) return res.status(404).json({ error: "Article not found" });

  const newComment = {
    id: "com-" + Date.now() + Math.random().toString(36).substring(2, 9),
    articleId: id,
    userId,
    username,
    content,
    timestamp: new Date().toISOString(),
    sentiment: 'neutral'
  };

  await db.prepare(`
    INSERT INTO comments (id, articleId, userId, username, content, timestamp, sentiment)
    VALUES (@id, @articleId, @userId, @username, @content, @timestamp, @sentiment)
  `).run(newComment);

  await db.prepare('UPDATE articles SET commentsCount = commentsCount + 1 WHERE id = ?').run(id);

  // Non-blocking AI Sentiment Analysis
  if (ai) {
    (async () => {
      try {
        const prompt = `Analyze the sentiment of the following comment on a news article. Reply ONLY with one of the following words in lowercase: positive, neutral, negative.\n\nComment: "${content}"`;
        const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
        let sentimentRaw = response.text?.trim().toLowerCase() || 'neutral';
        if (!['positive', 'neutral', 'negative'].includes(sentimentRaw)) sentimentRaw = 'neutral';
        await db.prepare('UPDATE comments SET sentiment = ? WHERE id = ?').run(sentimentRaw, newComment.id);
      } catch (err) {
        console.warn("Sentiment Analysis AI Error:", err);
      }
    })();
  }

  res.status(201).json(newComment);
});

// ==========================================
// Notification Center APIs
// ==========================================

app.get("/api/notifications", async (req: any, res: any) => {
  const notifications = await db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC').all();
  res.json(notifications);
});

app.post("/api/notifications/trigger-breaking", authenticateToken, requireAdmin, async (req, res) => {
  const { articleId, title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  if (articleId) {
    await db.prepare('UPDATE articles SET isBreaking = 1 WHERE id = ?').run(articleId);
  }

  const newNotification = {
    id: "notif-" + Date.now(),
    type: "breaking",
    title,
    message,
    articleId: articleId || null,
    timestamp: new Date().toISOString()
  };

  await db.prepare(`
    INSERT INTO notifications (id, type, title, message, articleId, timestamp)
    VALUES (@id, @type, @title, @message, @articleId, @timestamp)
  `).run(newNotification);

  broadcastSSE('refresh_content');
  res.status(201).json(newNotification);
});


// ==========================================
// Hybrid Storage: GitHub Image Upload API
// ==========================================

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

    // Clean base64 string if it contains the data URI scheme prefix
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, "");

    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const uploadPath = `uploads/${uniqueFilename}`;

    const githubApiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${uploadPath}`;

    const response = await fetch(githubApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MarathiFastNews-CMS'
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

    // Return the raw URL (assuming main branch)
    const rawUrl = `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/main/${uploadPath}`;
    
    res.status(201).json({ url: rawUrl });
  } catch (err) {
    console.error("Upload crash:", err);
    res.status(500).json({ error: "Internal server error during upload" });
  }
});

// ==========================================
// Content Management System (CMS) & Admin Core
// ==========================================

app.post("/api/articles", authenticateToken, requireAdmin, async (req, res) => {
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
    publishedAt: new Date().toISOString(),
    author,
    views: 1,
    likes: 0,
    isBreaking: isBreaking ? 1 : 0,
    videoUrl: videoUrl || "",
    location: location || null,
    mediaType: mediaType || 'standard',
    commentsCount: 0
  };

  await db.prepare(`
    INSERT INTO articles (id, title, content, summary, category, source, imageUrl, publishedAt, author, views, likes, isBreaking, videoUrl, commentsCount, location, mediaType)
    VALUES (@id, @title, @content, @summary, @category, @source, @imageUrl, @publishedAt, @author, @views, @likes, @isBreaking, @videoUrl, @commentsCount, @location, @mediaType)
  `).run(newArticle);

  if (newArticle.isBreaking) {
    await db.prepare(`
      INSERT INTO notifications (id, type, title, message, articleId, timestamp)
      VALUES (?, 'breaking', 'BREAKING NEWS ALERT', ?, ?, ?)
    `).run("notif-auto-" + Date.now(), `\${newArticle.title} - reported by \${newArticle.source}`, newArticle.id, new Date().toISOString());
  }

  broadcastSSE('refresh_content');
  res.status(201).json({ ...newArticle, isBreaking: Boolean(newArticle.isBreaking) });
});

app.put("/api/articles/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, summary, category, source, imageUrl, author, isBreaking, videoUrl, location, mediaType } = req.body;
  
  const info = await db.prepare(`
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
    title, content, summary, category, source, imageUrl, author, 
    isBreaking !== undefined ? (isBreaking ? 1 : 0) : null, 
    videoUrl, location, mediaType, id
  );

  if (info.changes === 0) return res.status(404).json({ error: "Article not found" });
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
  article.isBreaking = Boolean(article.isBreaking);
  broadcastSSE('refresh_content');
  res.json({ message: "Article updated successfully", article });
});

app.delete("/api/articles/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const info = await db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Article not found" });
  broadcastSSE('refresh_content');
  res.json({ message: "Article archived and deleted successfully" });
});

// Admin User Accounts Control
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  const users = await db.prepare('SELECT id, username, email, role, interests, savedArticles, notificationsEnabled, registeredAt FROM users').all() as any[];
  users.forEach(u => {
    u.interests = JSON.parse(u.interests);
    u.savedArticles = JSON.parse(u.savedArticles);
    u.notificationsEnabled = Boolean(u.notificationsEnabled);
  });
  res.json(users);
});

app.put("/api/admin/users/:id/role", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const info = await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (info.changes === 0) return res.status(404).json({ error: "User profile not found" });
  res.json({ message: "User privileges successfully altered" });
});

app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const info = await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User account suspended successfully" });
});

// Comment Moderation APIs
app.get("/api/admin/comments", authenticateToken, requireAdmin, async (req, res) => {
  const comments = await db.prepare(`
    SELECT c.*, a.title as articleTitle, a.category as articleCategory 
    FROM comments c
    LEFT JOIN articles a ON c.articleId = a.id
    ORDER BY c.timestamp DESC
  `).all();
  res.json(comments);
});

app.delete("/api/admin/comments/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const comment = await db.prepare('SELECT articleId FROM comments WHERE id = ?').get(id) as any;
  if (!comment) return res.status(404).json({ error: "Comment not found" });

  await db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  await db.prepare('UPDATE articles SET commentsCount = MAX(0, commentsCount - 1) WHERE id = ?').run(comment.articleId);

  res.json({ message: "Comment removed successfully" });
});

// Analytics Reporting
app.get("/api/admin/analytics", authenticateToken, requireAdmin, async (req, res) => {
  const totalViewsObj = await db.prepare('SELECT SUM(views) as t FROM articles').get() as any;
  const totalViews = totalViewsObj?.t || 0;
  const totalArticlesObj = await db.prepare('SELECT COUNT(*) as t FROM articles').get() as any;
  const totalArticles = totalArticlesObj?.t || 0;
  const totalUsersObj = await db.prepare('SELECT COUNT(*) as t FROM users').get() as any;
  const totalUsers = totalUsersObj?.t || 0;
  const totalCommentsObj = await db.prepare('SELECT COUNT(*) as t FROM comments').get() as any;
  const totalComments = totalCommentsObj?.t || 0;

  const categories = ["Politics", "Technology", "Business", "Sports", "Science", "Entertainment"];
  const categoryStats = await Promise.all(categories.map(async cat => {
    const stats = await db.prepare('SELECT COUNT(*) as c, SUM(views) as v FROM articles WHERE LOWER(category) = LOWER(?)').get(cat) as any;
    return { category: cat, count: stats?.c || 0, views: stats?.v || 0 };
  }));

  const dailyTrafficData = await db.prepare('SELECT date, views FROM daily_traffic ORDER BY date DESC LIMIT 7').all() as any[];
  const today = new Date();
  const dailyViews = Array.from({length: 7}).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const row = dailyTrafficData.find(dt => dt.date === dateStr);
    return { date: shortDate, views: row ? row.views : 0, articles: totalArticles }; 
  });

  const sentiments = await db.prepare('SELECT sentiment, COUNT(*) as count FROM comments GROUP BY sentiment').all() as any[];
  let pos = 0, neu = 0, neg = 0;
  let totalS = 0;
  sentiments.forEach(s => {
    totalS += s.count;
    if (s.sentiment === 'positive') pos = s.count;
    else if (s.sentiment === 'negative') neg = s.count;
    else neu = s.count;
  });
  
  const sentimentBreakdown = totalS > 0 ? {
    positive: Math.round((pos / totalS) * 100),
    neutral: Math.round((neu / totalS) * 100),
    negative: Math.round((neg / totalS) * 100)
  } : { positive: 0, neutral: 100, negative: 0 };

  res.json({
    totalViews, totalArticles, totalUsers, totalComments,
    categoryStats, dailyViews, sentimentBreakdown
  });
});

// ==========================================
// Translations & AI APIs
// ==========================================
const preseededTranslations: { [key: string]: { [key: string]: string } } = {
  "en-mr": {
    "politics": "राजकारण",
    "technology": "तंत्रज्ञान",
    "business": "व्यवसाय",
    "sports": "क्रीडा",
    "science": "विज्ञान",
    "entertainment": "मनोरंजन",
    "read more": "अधिक वाचा",
    "share story link": "गोष्ट लिंक शेअर करा",
    "recent alerts & critical updates": "अलीकडील इशारे आणि गंभीर अद्यतने",
    "post reflection": "प्रतिक्रिया पोस्ट करा",
    "no active alerts": "सध्या कोणतेही सक्रिय इशारे नाहीत.",
    "hello world": "नमस्कार जग",
    "hello, world!": "नमस्कार, जग!",
    "marathi fast news": "मराठी फास्ट न्यूज",
    "breaking alert": "महत्त्वाची बातमी",
    "Mumbai Metro Line 3 Phase 1 Commences Operations: Revolutionizing Urban Transit": "मुंबई मेट्रो मार्ग ३ च्या पहिल्या टप्प्याचे उद्घाटन: नागरी वाहतुकीत क्रांती",
    "Phase 1 of Mumbai Metro Line 3 (Aarey to BKC) is now operational. The 12.5 km underground line significantly cuts travel time and congestion in Mumbai.": "मुंबई मेट्रो मार्ग ३ चा पहिला टप्पा (आरे ते बीकेसी) आता कार्यान्वित झाला आहे. १२.५ किमीचा भुयारी मार्ग मुंबईतील प्रवासाची वेळ आणि वाहतूक कोंडी लक्षणीयरीत्या कमी करतो.",
    "Pune Declared India's Top Emerging Semiconductor Hub with Multi-Billion Investment": "अब्जावधींच्या गुंतवणुकीसह पुणे भारताचे आघाडीचे सेमीकंडक्टर हब घोषित",
    "Pune gets a massive semiconductor fabrication plant with multi-billion investments, creating 50,000 jobs and bolstering India's semiconductor mission.": "अब्जावधींच्या गुंतवणुकीसह पुण्यात सेमीकंडक्टर प्लांट उभारला जाणार असून, यामुळे ५०,००० नोकऱ्या निर्माण होतील आणि भारताचे सेमीकंडक्टर मिशनला बळ मिळेल.",
    "Maharashtra Kabaddi League Finals: Pune Panthers Clinch Championship in Thrilling Finish": "महाराष्ट्र कबड्डी लीग अंतिम सामना: पुणे पँथर्सने अटीतटीच्या सामन्यात पटकावले विजेतेपद",
    "Pune Panthers defeated Mumbai Monarchs 38-36 in the Maharashtra Kabaddi League finals to win the title in a thrilling finish at Pune.": "पुणे पँथर्सने महाराष्ट्र कबड्डी लीगच्या अंतिम सामन्यात मुंबई मोनार्क्सचा ३८-३६ असा पराभव करून विजेतेपद पटकावले.",
    "Maharashtra Chitrapat Mahotsav: 'Sahyadri' Wins Best Marathi Feature Film Award": "महाराष्ट्र राज्य चित्रपट महोत्सव: 'सह्याद्री' ठरला सर्वोत्तम मराठी चित्रपट",
    "'Sahyadri' won the Best Feature Film award at the Maharashtra Chitrapat Mahotsav, with Swapnil Joshi and Mukta Barve winning top acting honors.": "महाराष्ट्र राज्य चित्रपट महोत्सवात 'सह्याद्री'ला सर्वोत्कृष्ट चित्रपटाचा पुरस्कार मिळाला, तर स्वप्निल जोशी आणि मुक्ता बर्वे यांना सर्वोत्कृष्ट अभिनयाचे मानकरी ठरविण्यात आले."
  },
  "mr-en": {}
};
for (const [enText, mrText] of Object.entries(preseededTranslations["en-mr"])) {
  preseededTranslations["mr-en"][mrText] = enText;
}

const translationCache = new Map<string, string>();
const summaryCache = new Map<string, string>();

app.post("/api/ai/translate", async (req, res) => {
  const { text, direction } = req.body;
  if (!text) return res.status(400).json({ error: "Text content is required for translation" });
  const isEnToMr = direction === "en-mr";
  const cleanText = text.trim();
  const cacheKey = `${direction}:${cleanText}`;
  const lookupNormalized = (txt: string, dict: { [key: string]: string }) => {
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
    if (isEnToMr) return res.json({ translatedText: `[मराठी]: ${text}` });
    return res.json({ translatedText: `${text} (Translated)` });
  }
  try {
    let prompt = isEnToMr 
      ? `Translate the following English text accurately and naturally into highly professional Marathi. Only return the translated Marathi text.\n\nEnglish Text:\n${text}`
      : `Translate the following Marathi text accurately and naturally into professional English. Only return the translated English text.\n\nMarathi Text:\n${text}`;
    const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
    const translatedResult = response.text?.trim() || "";
    if (translatedResult && translatedResult !== "Translation failed.") {
      translationCache.set(cacheKey, translatedResult);
      return res.json({ translatedText: translatedResult });
    }
    throw new Error("Empty translation returned from Gemini API");
  } catch (error: any) {
    console.warn("Gemini AI API Error during translation", error.message || error);
    return res.json({ translatedText: isEnToMr ? `[मराठी]: ${text}` : `${text} (Translated)` });
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
    const prompt = `You are a professional lead editor. Provide a highly engaging, concise (max 3 bullet points) summary of this article, focusing on key facts. Format with bold key terms.\n\nTitle: ${title || "News Update"}\nArticle Content:\n${content}`;
    const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
    const summaryResult = response.text || "Failed to generate AI editorial brief.";
    summaryCache.set(cacheKey, summaryResult);
    res.json({ summary: summaryResult });
  } catch (error: any) {
    console.warn("Gemini AI API Error during summarization", error.message || error);
    res.json({ summary: `[AI Insight Brief] Based on '${title || "Latest Stories"}': This crucial story highlights strategic milestones and the long-term impact on global infrastructure levels.` });
  }
});

app.post("/api/ai/admin-insights", authenticateToken, requireAdmin, async (req, res) => {
  const { totalViews, totalArticles, totalUsers, totalComments, focusCategory } = req.body;
  if (!ai) {
    const fallbackInsight = `[Review Panel Insight] Reader engagement is peaking around ${focusCategory || 'technology'} issues. Recommend increasing editorial pacing toward these briefs.`;
    return res.json({ insight: fallbackInsight });
  }
  try {
    const prompt = `As a high-level digital publishing chief strategist, look at our portal's latest metrics and write a brief, highly professional 2-sentence executive guidance card.
    Metrics: Views: ${totalViews}, Articles: ${totalArticles}, Users: ${totalUsers}, Comments: ${totalComments}, Top Category: ${focusCategory || "Technology"}. Keep it sharp and data-driven.`;
    const response = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: prompt });
    res.json({ insight: response.text || "An unexpected error disrupted the analytics agent." });
  } catch (err: any) {
    console.warn("Gemini AI error during analytics", err.message || err);
    res.json({ insight: `[Review Panel Insight] Reader engagement is peaking around ${focusCategory || 'technology'} issues. Recommend increasing editorial pacing toward these briefs.` });
  }
});

app.get("/googlea4015d58ba6aed96.html", (req: any, res: any) => {
  res.send("google-site-verification: googlea4015d58ba6aed96.html");
});

const sitemapXsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap | Marathi Fast News</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            color: #f8fafc;
            margin: 0;
            padding: 40px 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }
          h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-top: 0;
            background: linear-gradient(to right, #38bdf8, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: inline-block;
          }
          p.subtitle {
            color: #94a3b8;
            font-size: 1.1rem;
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            text-align: left;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            color: #38bdf8;
            font-weight: 600;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          }
          td {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.95rem;
          }
          tr:hover td {
            background: rgba(255, 255, 255, 0.02);
          }
          a {
            color: #a855f7;
            text-decoration: none;
            transition: color 0.2s ease;
          }
          a:hover {
            color: #c084fc;
            text-decoration: underline;
          }
          .priority-high {
            color: #22c55e;
            font-weight: 600;
          }
          .priority-medium {
            color: #eab308;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #64748b;
            font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>XML Sitemap</h1>
          <p class="subtitle">This is a XML Sitemap generated for search engines like Google, Bing, and Yahoo to index the news articles. There are <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs in this sitemap.</p>
          
          <table>
            <thead>
              <tr>
                <th width="60%">URL</th>
                <th width="15%">Priority</th>
                <th width="15%">Change Freq</th>
                <th width="10%">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="sitemap:priority &gt;= 0.8">
                        <span class="priority-high"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:when>
                      <xsl:otherwise>
                        <span class="priority-medium"><xsl:value-of select="sitemap:priority"/></span>
                      </xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td>
                    <xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          
          <div class="footer">
            Generated by Marathi Fast News Sitemap System. Learn more about XML sitemaps at <a href="https://sitemaps.org">sitemaps.org</a>.
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

app.get("/sitemap.xsl", (req: any, res: any) => {
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600");
  res.send(sitemapXsl);
});

app.get("/robots.txt", (req: any, res: any) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600");
  res.send(`User-agent: *\nAllow: /\n\nSitemap: https://marathi-fast-news.vercel.app/sitemap.xml`);
});

app.get(["/sitemap.xml", "/sitemap.xml/"], async (req: any, res: any) => {
  // Set headers BEFORE anything else
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const escapeXml = (str: string) => {
    return String(str).replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  try {
    let articles: any[] = [];
    try {
      articles = await db.prepare('SELECT id, publishedAt FROM articles ORDER BY publishedAt DESC').all() as any[];
    } catch (dbErr) {
      console.error("Sitemap DB fetch error:", dbErr);
    }

    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    lines.push('  <url>');
    lines.push('    <loc>https://marathi-fast-news.vercel.app/</loc>');
    lines.push('    <changefreq>daily</changefreq>');
    lines.push('    <priority>1.0</priority>');
    lines.push('  </url>');

    articles.forEach(art => {
      let dateStr = new Date().toISOString().split('.')[0] + 'Z';
      if (art.publishedAt) {
        try {
          const parsed = new Date(art.publishedAt);
          if (!isNaN(parsed.getTime())) {
            dateStr = parsed.toISOString().split('.')[0] + 'Z';
          }
        } catch (e) { /* use current date */ }
      }
      const safeId = escapeXml(encodeURIComponent(String(art.id)));
      lines.push('  <url>');
      lines.push(`    <loc>https://marathi-fast-news.vercel.app/?story=${safeId}</loc>`);
      lines.push(`    <lastmod>${dateStr}</lastmod>`);
      lines.push('    <changefreq>weekly</changefreq>');
      lines.push('    <priority>0.8</priority>');
      lines.push('  </url>');
    });

    lines.push('</urlset>');
    res.end(lines.join('\n'));
  } catch (err) {
    console.error("Sitemap error:", err);
    res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// ==========================================
// Vite Dev & Production Asset Pipelines Setup
// ==========================================

if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  async function startServer() {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Express Full-stack server running successfully on http://localhost:${PORT}`);
    });
  }
  startServer();
} else if (process.env.VERCEL !== "1") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => res.sendFile(path.join(distPath, "index.html")));
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Full-stack server running successfully on http://localhost:${PORT}`);
  });
}

// Export the app for Vercel Serverless functions
export default app;
  
