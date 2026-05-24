import React, { useState, useEffect } from 'react';
import { Eye, Heart, MessageSquare, Bookmark, Share2, Sparkles, MapPin, PlayCircle } from 'lucide-react';
import { Article, User } from '../types';
import { getUITranslation, Language } from '../utils/translation';

interface ArticleCardProps {
  key?: string | number;
  article: Article;
  currentUser: User | null;
  onSelect: () => void;
  onToggleSave: (articleId: string) => void;
  isSaved: boolean;
  language: Language;
}

export default function ArticleCard({
  article,
  currentUser,
  onSelect,
  onToggleSave,
  isSaved,
  language
}: ArticleCardProps) {
  
  // Translation Cache
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedSummary, setTranslatedSummary] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (language === 'mr') {
      if (translatedTitle && translatedSummary) return;

      const performTranslation = async () => {
        try {
          setIsTranslating(true);
          // Translate title
          const titleRes = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: article.title, direction: 'en-mr' })
          });
          const titleData = await titleRes.json();

          // Translate summary
          const summaryRes = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: article.summary, direction: 'en-mr' })
          });
          const summaryData = await summaryRes.json();

          if (titleRes.ok && summaryRes.ok) {
            setTranslatedTitle(titleData.translatedText);
            setTranslatedSummary(summaryData.translatedText);
          }
        } catch (err) {
          console.warn("Card translation error:", err);
        } finally {
          setIsTranslating(false);
        }
      };

      performTranslation();
    }
  }, [language, article.title, article.summary]);
  
  // Dynamic category tags configuration
  const getCategoryTheme = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'technology':
        return 'bg-purple-50 text-purple-700 border-purple-100/60';
      case 'science':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100/60';
      case 'politics':
        return 'bg-rose-50 text-rose-700 border-rose-100/60';
      case 'business':
        return 'bg-sky-50 text-sky-700 border-sky-100/60';
      case 'sports':
        return 'bg-amber-50 text-amber-700 border-amber-100/60';
      default:
        return 'bg-pink-50 text-pink-700 border-pink-100/60';
    }
  };

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <article
      id={`article-card-${article.id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
    >
      {/* Article Image Accent Wrapper */}
      <div className="relative aspect-video overflow-hidden bg-slate-100 object-cover cursor-pointer" onClick={onSelect}>
        <img
          src={article.imageUrl}
          alt={article.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Video Overlay Indicator */}
        {(article.mediaType === 'video' || (!article.mediaType && article.videoUrl)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors z-10 pointer-events-none">
            <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-md shadow-2xl border border-white/30 transform group-hover:scale-110 transition-transform">
              <PlayCircle className="h-10 w-10 text-white fill-white/20" strokeWidth={1.5} />
            </div>
          </div>
        )}
        
        {/* Category Badge Indicator in Overlay */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getCategoryTheme(article.category)}`}>
            {getUITranslation("category_" + article.category.toLowerCase(), language)}
          </span>
          {article.isBreaking && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white animate-pulse shadow-sm">
              {getUITranslation("breaking_alert", language)}
            </span>
          )}
        </div>

        {/* Source overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-slate-900/75 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono font-medium">
            {article.source}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col justify-between" id={`card-content-${article.id}`}>
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 font-mono mb-2">
            <span>{article.author}</span>
            <span>•</span>
            <span>{formattedDate}</span>
            {article.location && (
              <>
                <span>•</span>
                <span className="flex items-center text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded shadow-sm border border-indigo-100">
                  <MapPin className="h-2.5 w-2.5 mr-1" />
                  {article.location}
                </span>
              </>
            )}
          </div>

          <h3
            onClick={onSelect}
            className="font-display font-bold text-slate-800 text-sm md:text-base leading-snug hover:text-blue-600 transition-colors cursor-pointer mb-2 line-clamp-2"
          >
            {isTranslating ? (
              <span className="flex items-center space-x-1 text-slate-400 font-mono text-xs">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-slate-500" />
                <span className="animate-pulse">अनुवाद होत आहे...</span>
              </span>
            ) : language === 'mr' ? (
              translatedTitle || article.title
            ) : (
              article.title
            )}
          </h3>

          <div className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
            {isTranslating ? (
              <span className="block h-3 bg-slate-100 rounded animate-pulse w-full mb-1.5" />
            ) : language === 'mr' ? (
              translatedSummary || article.summary
            ) : (
              article.summary
            )}
          </div>
        </div>

        {/* Stats and bookmark tools footer bar */}
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between" id={`card-footer-${article.id}`}>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center space-x-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{article.views}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              <span>{article.likes}</span>
            </span>
            <span className="flex items-center space-x-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{article.commentsCount || 0}</span>
            </span>
          </div>

          {currentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(article.id);
              }}
              className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                isSaved
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
              title={isSaved ? "Remove from bookmarks" : "Save article"}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-blue-600" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
