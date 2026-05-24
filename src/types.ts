export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  interests: string[];
  savedArticles: string[];
  notificationsEnabled: boolean;
  registeredAt: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: 'Politics' | 'Technology' | 'Business' | 'Sports' | 'Science' | 'Entertainment';
  source: string;
  imageUrl: string;
  publishedAt: string;
  author: string;
  views: number;
  likes: number;
  isBreaking: boolean;
  videoUrl?: string; // curating simulated live feeds
  location?: string;
  mediaType?: 'image' | 'video' | 'standard';
  commentsCount: number;
}

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

export interface EnrichedComment extends Comment {
  articleTitle: string;
  articleCategory: string;
}

export interface SystemNotification {
  id: string;
  type: 'breaking' | 'personalized' | 'system';
  title: string;
  message: string;
  articleId?: string;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalArticles: number;
  totalUsers: number;
  totalComments: number;
  categoryStats: { category: string; count: number; views: number }[];
  dailyViews: { date: string; views: number; articles: number }[];
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
}
