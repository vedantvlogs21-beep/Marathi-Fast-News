import React, { useState, useEffect } from 'react';
import { 
  X, Eye, Heart, MessageSquare, Compass, Radio, Sparkles, 
  Share2, Twitter, Facebook, ExternalLink, Link2, Check, Send,
  Languages, Maximize2, Minimize2
} from 'lucide-react';
import { Article, Comment, User } from '../types';
import { getUITranslation, Language } from '../utils/translation';

interface ArticleModalProps {
  articleId: string;
  articles: Article[];
  currentUser: User | null;
  onClose: () => void;
  onLike: (id: string, updatedLikes: number) => void;
  onAddCommentCount: (id: string, newCount: number) => void;
  appLanguage: Language;
  fontSize?: 'small' | 'medium' | 'large';
}

export default function ArticleModal({
  articleId,
  articles,
  currentUser,
  onClose,
  onLike,
  onAddCommentCount,
  appLanguage,
  fontSize = 'medium'
}: ArticleModalProps) {
  const [article, setArticle] = useState<Article | null>(() => {
    return articles.find(a => a.id === articleId) || null;
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(!article);
  
  // Custom Live Stream view toggle
  const [isPlayingStream, setIsPlayingStream] = useState(false);
  
  // AI summary states
  const [aiSummary, setAiSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Social sharing states
  const [copiedLink, setCopiedLink] = useState(false);
  const [liked, setLiked] = useState(false);

  // Language translation states
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedContent, setTranslatedContent] = useState('');
  const [isTranslatingArticle, setIsTranslatingArticle] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'mr'>('en');
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  // Image error fallback state
  const [modalImgError, setModalImgError] = useState(false);

  // Automatically fetch translation when appLanguage/global language changes to mr
  useEffect(() => {
    if (appLanguage === 'mr' && article) {
      if (translatedTitle && translatedContent) {
        setCurrentLanguage('mr');
        return;
      }
      
      const autoTranslate = async () => {
        try {
          setIsTranslatingArticle(true);
          const titleRes = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: article.title, direction: 'en-mr' })
          });
          const titleData = await titleRes.json();

          const contentRes = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: article.content, direction: 'en-mr' })
          });
          const contentData = await contentRes.json();

          if (titleRes.ok && contentRes.ok) {
            setTranslatedTitle(titleData.translatedText);
            setTranslatedContent(contentData.translatedText);
            setCurrentLanguage('mr');
          }
        } catch (err) {
          console.warn("Auto-translation issue:", err);
        } finally {
          setIsTranslatingArticle(false);
        }
      };
      autoTranslate();
    } else {
      setCurrentLanguage('en');
    }
  }, [appLanguage, article?.id]);

  const handleTranslateArticle = async () => {
    if (!article) return;
    if (currentLanguage === 'mr') {
      setCurrentLanguage('en');
      return;
    }

    if (translatedTitle && translatedContent) {
      setCurrentLanguage('mr');
      return;
    }

    try {
      setIsTranslatingArticle(true);
      
      // Translate Title
      const titleRes = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: article.title, direction: 'en-mr' })
      });
      const titleData = await titleRes.json();

      // Translate Content
      const contentRes = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: article.content, direction: 'en-mr' })
      });
      const contentData = await contentRes.json();

      if (titleRes.ok && contentRes.ok) {
        setTranslatedTitle(titleData.translatedText);
        setTranslatedContent(contentData.translatedText);
        setCurrentLanguage('mr');
      }
    } catch (err) {
      console.error("Translation issue:", err);
    } finally {
      setIsTranslatingArticle(false);
    }
  };

  useEffect(() => {
    fetchArticleDetails();
  }, [articleId]);

  const fetchArticleDetails = async () => {
    try {
      setLoading(true);
      // Fetch article which also bumps view count in server
      const articleRes = await fetch(`/api/articles/${articleId}`);
      if (!articleRes.ok) throw new Error("Could not download article information");
      const articleData: Article = await articleRes.json();
      setArticle(articleData);

      // Fetch comments list
      const commentsRes = await fetch(`/api/articles/${articleId}/comments`);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (liked || !article) return;
    try {
      const res = await fetch(`/api/articles/${article.id}/like`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArticle({ ...article, likes: data.likes });
        setLiked(true);
        onLike(article.id, data.likes);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleTriggerAISummary = async () => {
    if (!article) return;
    try {
      setGeneratingSummary(true);
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error("AI briefing issue:", err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser || !article) return;

    try {
      const res = await fetch(`/api/articles/${article.id}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username,
          content: newCommentText.trim()
        })
      });
      if (res.ok) {
        const freshComment: Comment = await res.json();
        const updatedList = [freshComment, ...comments];
        setComments(updatedList);
        setNewCommentText('');
        
        // Notify parent about comments count tweak
        const revisedCount = (article.commentsCount || 0) + 1;
        setArticle({ ...article, commentsCount: revisedCount });
        onAddCommentCount(article.id, revisedCount);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyShareLink = () => {
    // Generates share credentials using query parameter for cross-platform fallback
    const dummyUrl = `${window.location.origin}/?story=${article?.id}`;
    navigator.clipboard.writeText(dummyUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border shadow-xl">
          <div className="inline-block h-8 w-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
          <p className="text-xs text-slate-500 font-medium">{getUITranslation("downloading_contents", appLanguage)}</p>
        </div>
      </div>
    );
  }

  if (!article) return null;

  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 print:absolute print:inset-0 print:bg-white print:p-0 print:flex-col print:overflow-visible" id="article-cover-modal">
      <div className={`bg-white rounded-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col transform transition-all duration-500 print:max-h-none print:shadow-none print:rounded-none print:max-w-full print:border-0 print:overflow-visible ${isDistractionFree ? 'max-w-3xl border-0' : 'max-w-4xl border border-slate-100'}`}>
        
        {/* Sticky Close Header banner */}
        <div className={`sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b flex items-center justify-between z-10 transition-colors print:hidden ${isDistractionFree ? 'border-transparent' : 'border-slate-150'}`}>
          <div className="flex items-center space-x-2">
            {!isDistractionFree && (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 text-slate-500">
                  {getUITranslation("category_" + article.category.toLowerCase(), appLanguage)}
                </span>
                {article.isBreaking && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                    {getUITranslation("breaking_alert", appLanguage)}
                  </span>
                )}
              </>
            )}
            <button
              onClick={() => setIsDistractionFree(!isDistractionFree)}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Toggle Distraction-Free Reading"
            >
              {isDistractionFree ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="text-[10px] font-medium hidden sm:inline">{isDistractionFree ? "Exit Focus Mode" : "Focus Mode"}</span>
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            id="close-cover-modal-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Header */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">
              {article.source} {getUITranslation("report_suffix", appLanguage)}
            </span>
            <h2 className="font-display font-extrabold text-xl md:text-2xl text-slate-900 leading-tight">
              {isTranslatingArticle ? (
                <span className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                  <span className="inline-block h-3 w-3 border-2 border-slate-350 border-t-slate-800 rounded-full animate-spin" />
                  <span>भाषांतर होत आहे / Translating title...</span>
                </span>
              ) : currentLanguage === 'mr' ? (
                translatedTitle || article.title
              ) : (
                article.title
              )}
            </h2>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono mt-3">
              <span>{getUITranslation("by", appLanguage)} {article.author}</span>
              <span className="hidden md:inline">•</span>
              <span>{publishedDate}</span>
            </div>
          </div>

          {/* Broadcast / Media Segment Selection - always shown */}
          {!isDistractionFree && (
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-900 shadow-none print:hidden">
            
            {isPlayingStream && article.videoUrl ? (
              <div className="aspect-video w-full relative">
                {/* Embedded actual Video Stream */}
                <iframe
                  className="w-full h-full"
                  src={`${article.videoUrl}?autoplay=1`}
                  title="Live Broadcast Coverage Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                
                {/* Live video overlay helper */}
                <button
                  onClick={() => setIsPlayingStream(false)}
                  className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full transition-all flex items-center space-x-1 z-10"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>{getUITranslation("exit_broadcast", appLanguage)}</span>
                </button>
              </div>
            ) : (
              <div className="relative aspect-video w-full">
                {/* Show real image or gradient placeholder */}
                {(!modalImgError && !article.imageUrl.includes('1451187580459') && article.imageUrl) ? (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-[0.82] transition-transform duration-700"
                    onError={() => setModalImgError(true)}
                  />
                ) : (
                  <div className={`w-full h-full flex items-end p-6 bg-gradient-to-br ${
                    article.category === 'Technology' ? 'from-violet-700 to-indigo-900' :
                    article.category === 'Politics'   ? 'from-rose-700 to-red-900' :
                    article.category === 'Business'   ? 'from-sky-600 to-blue-900' :
                    article.category === 'Sports'     ? 'from-amber-500 to-orange-800' :
                    article.category === 'Science'    ? 'from-emerald-600 to-teal-900' :
                                                       'from-pink-600 to-fuchsia-900'
                  }`}>
                    <span className="text-white/15 font-display font-black text-8xl uppercase tracking-tight leading-none select-none">
                      {article.category}
                    </span>
                  </div>
                )}

                {article.videoUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-t from-slate-950/80 via-transparent to-transparent">
                    <button
                      onClick={() => setIsPlayingStream(true)}
                      className="p-4 rounded-full bg-red-650 hover:bg-red-700 hover:scale-105 text-white shadow-xl transition-all flex items-center justify-center cursor-pointer mb-2 animate-bounce"
                      title="Activate live coverage"
                    >
                      <Radio className="h-7 w-7 animate-pulse" />
                    </button>
                    <p className="text-white font-display font-bold text-sm tracking-wide">
                      {getUITranslation("watch_live_feed", appLanguage)}
                    </p>
                    <p className="text-slate-300 text-xs mt-1">
                      {getUITranslation("simulated_analysis", appLanguage)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Social sharing and rating floating rail */}
          {!isDistractionFree && (
            <div className="flex items-center justify-between py-3 border-y border-slate-50 bg-slate-50/50 px-4 rounded-xl print:hidden" id="modal-social-actions-bar">
            
            {/* Left stats: increment likes manually with responsive state */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                disabled={liked}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  liked
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                id="modal-like-btn"
              >
                <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{liked ? getUITranslation("endorsed", appLanguage) : getUITranslation("recommend_story", appLanguage)}</span>
                <span className="font-mono text-xs text-slate-405">({article.likes})</span>
              </button>

              <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-503 font-mono">
                <Eye className="h-4 w-4" />
                <span>{article.views} {getUITranslation("views", appLanguage)}</span>
              </div>
            </div>

            {/* Right Group: Social Sharing Channels */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 hidden lg:inline mr-2">{getUITranslation("share_link", appLanguage)}</span>
              
              <button
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}`, '_blank')}
                className="p-2 bg-white border border-slate-200 hover:bg-sky-50 hover:text-sky-600 rounded-full transition-colors cursor-pointer"
                title="Share on Twitter / X"
              >
                <Twitter className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                className="p-2 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors cursor-pointer"
                title="Share on Facebook"
              >
                <Facebook className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={copyShareLink}
                className={`p-2 bg-white border rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  copiedLink
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
                title="Copy shareable story address"
                id="modal-copy-link-btn"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              </button>
            </div>

          </div>
          )}

          {/* Main Editorial Content */}
          <div className={`space-y-4 print:block ${isDistractionFree ? 'py-8 px-4 md:px-12 leading-loose' : ''}`}>
            <h3 className="font-display font-bold text-slate-900 border-b pb-2 hidden">Main Article Information</h3>
            
            {isTranslatingArticle ? (
              <div className="space-y-3 py-4">
                <p className="flex items-center gap-2 text-slate-400 text-xs font-mono mb-2">
                  <span className="inline-block h-3 w-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin shrink-0" />
                  <span>लेख भाषांतरित केला जात आहे / Translating article contents...</span>
                </p>
                <div className="h-4 bg-slate-100 rounded w-full animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-11/12 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-4/5 animate-pulse" />
              </div>
            ) : (
              <p className={`text-slate-800 font-sans first-letter:text-4xl first-letter:font-extrabold first-letter:float-left first-letter:mr-2.5 first-letter:font-display animate-fade-in print:text-black print:text-base ${
                isDistractionFree 
                  ? fontSize === 'large' ? 'text-2xl leading-[2.2]' : fontSize === 'small' ? 'text-base leading-loose' : 'text-xl leading-loose tracking-wide' 
                  : fontSize === 'large' ? 'text-lg leading-relaxed' : fontSize === 'small' ? 'text-sm leading-relaxed' : 'text-base leading-relaxed'
              }`}>
                {currentLanguage === 'mr' ? translatedContent : article.content}
              </p>
            )}
            
            {!isDistractionFree && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3 text-xs leading-relaxed text-slate-500">
                <Compass className="h-5 w-5 text-slate-400 shrink-0" />
                <p>
                  {getUITranslation("p_verfied_under", appLanguage)} {article.source} {getUITranslation("p_details", appLanguage)}
                </p>
              </div>
            )}
          </div>



        </div>

      </div>
    </div>
  );
}
