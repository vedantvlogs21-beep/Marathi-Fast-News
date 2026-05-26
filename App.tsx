import React, { useState, useEffect } from 'react';
import { 
  Compass, Radio, Flame, Sparkles, Filter, ShieldAlert,
  Search, ArrowRight, Video, Tv, BellRing, UserCheck, Heart, Bookmark,
  Twitter, Instagram, Youtube, Facebook, Phone, Mail, User as UserIcon
} from 'lucide-react';
import Header from './components/Header';
import ArticleCard from './components/ArticleCard';
import ArticleModal from './components/ArticleModal';
import NotificationDrawer from './components/NotificationDrawer';
import AdminPanel from './components/AdminPanel';
import { Article, User, SystemNotification } from './types';
import { getUITranslation, Language } from './utils/translation';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'admin-override',
    username: 'system_admin',
    email: 'admin@marathifastnews.com',
    role: 'admin',
    interests: ["Technology", "Politics", "Science"],
    savedArticles: [],
    notificationsEnabled: true,
    registeredAt: new Date().toISOString()
  });
  const [articles, setArticles] = useState<Article[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [appLanguage, setAppLanguage] = useState<Language>('en');
  
  // Dashboard filtration states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'likes'>('newest');
  const [activeTab, setActiveTab] = useState<'home' | 'admin' | 'bookmarks'>('home');

  // Hero section translation state
  const [heroTitle, setHeroTitle] = useState('');
  const [heroContent, setHeroContent] = useState('');
  const [translatingHero, setTranslatingHero] = useState(false);

  // The Hero spot always displays the absolute newest article published
  const featuredStory = articles[0];

  useEffect(() => {
    // Instantly clear old translations so the new Hero article doesn't show old text
    setHeroTitle('');
    setHeroContent('');

    if (appLanguage === 'mr' && featuredStory) {
      const translateHero = async () => {
        try {
          setTranslatingHero(true);
          const titleRes = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: featuredStory.title, direction: 'en-mr' })
          });
          const titleData = await titleRes.json();

          const contentRes = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: featuredStory.content, direction: 'en-mr' })
          });
          const contentData = await contentRes.json();

          if (titleRes.ok && contentRes.ok) {
            setHeroTitle(titleData.translatedText);
            setHeroContent(contentData.translatedText);
          }
        } catch (err) {
          console.warn("Hero translation issue:", err);
        } finally {
          setTranslatingHero(false);
        }
      };
      translateHero();
    }
  }, [appLanguage, featuredStory?.id]);


  // Popup overlay configurations
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // General telemetry tracking
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Maintain persistent Server-Sent Events (SSE) connection
  useEffect(() => {
    const sse = new EventSource('/api/stream');
    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'refresh_content') {
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.warn("SSE parse error:", err);
      }
    };
    return () => sse.close();
  }, []);

  useEffect(() => {
    fetchArticles();
    fetchNotifications();
  }, [selectedCategory, searchQuery, sortBy, currentUser, refreshTrigger]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      let queryParams = `?category=${encodeURIComponent(selectedCategory)}&sortBy=${sortBy}&search=${encodeURIComponent(searchQuery)}`;
      
      // Personalization logic: If user is logged in, prioritize feeds according to select interests
      if (currentUser && selectedCategory === 'All') {
        queryParams += `&userId=${currentUser.id}`;
      }

      const res = await fetch(`/api/articles${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.warn("Articles fetch issues:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.warn(err);
    }
  };



  const handleToggleSaveArticle = async (articleId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const saved = currentUser.savedArticles || [];
    let revised: string[];

    if (saved.includes(articleId)) {
      revised = saved.filter(id => id !== articleId);
    } else {
      revised = [...saved, articleId];
    }

    try {
      const res = await fetch(`/api/user/profile/${currentUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ savedArticles: revised })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Keep in-memory parent data arrays updated when user likes from detailed views
  const handleLikeUpdate = (articleId: string, revisedLikes: number) => {
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, likes: revisedLikes } : a));
  };

  const handleCommentCountUpdate = (articleId: string, count: number) => {
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, commentsCount: count } : a));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setActiveTab('home');
  };

  // Saved articles subset grid
  const bookmarkedArticles = articles.filter(art => currentUser?.savedArticles.includes(art.id));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="applet-core-layout">
      
      {/* Top Header & Navigation Ribbon */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onOpenNotifications={() => {
          fetchNotifications();
          setShowNotifDrawer(true);
        }}
        selectedCategory={selectedCategory}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          setSearchQuery('');
        }}
        appLanguage={appLanguage}
        setAppLanguage={setAppLanguage}
      />

      {/* Main Dynamic View Modules */}
      <main className="flex-grow pb-12" id="main-content-scroller">
        
        {activeTab === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8" id="home-feed-view">
            
            {/* 1. Hero Spot Card: Interactive coverage summary / Breaking Alerts */}
            {featuredStory && !searchQuery && (
              <div 
                id="hero-breaking-alert-banner" 
                className="relative bg-slate-900 rounded-3xl overflow-hidden min-h-[380px] md:min-h-[440px] flex flex-col justify-end p-6 md:p-10 border border-slate-800 shadow-xl group"
              >
                {/* Visual background image wrapper */}
                <div className="absolute inset-0">
                  <img
                    src={featuredStory.imageUrl}
                    alt={featuredStory.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-[0.45] group-hover:scale-102 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
                </div>

                {/* Info and triggers */}
                <div className="relative z-10 max-w-2xl space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse flex items-center gap-1.5 shadow-md">
                      <Radio className="h-3 w-3" />
                      {getUITranslation("live_spotlight", appLanguage)}
                    </span>
                    <span className="bg-white/10 backdrop-blur-sm text-slate-100 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase">
                      {featuredStory.source}
                    </span>
                  </div>

                  <h1 
                    onClick={() => setSelectedArticleId(featuredStory.id)}
                    className="font-display font-extrabold text-white text-xl md:text-3xl leading-tight tracking-tight hover:text-blue-400 cursor-pointer transition-colors"
                  >
                    {translatingHero ? (
                      <span className="flex items-center space-x-1 text-slate-400 font-mono text-xs">
                        <Sparkles className="h-3.5 w-3.5 animate-spin mr-1" />
                        <span className="animate-pulse">अनुवाद होत आहे...</span>
                      </span>
                    ) : appLanguage === 'mr' ? (
                      heroTitle || featuredStory.title
                    ) : (
                      featuredStory.title
                    )}
                  </h1>

                  <p className="text-slate-300 text-xs md:text-sm leading-relaxed line-clamp-3">
                    {translatingHero ? (
                      <span className="inline-block h-3 bg-slate-700 rounded animate-pulse w-full" />
                    ) : appLanguage === 'mr' ? (
                      heroContent || featuredStory.content
                    ) : (
                      featuredStory.content
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => setSelectedArticleId(featuredStory.id)}
                      className="px-6 py-3 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-2"
                      id="hero-read-btn"
                    >
                      <span>{getUITranslation("examine_report", appLanguage)}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    {featuredStory.videoUrl && (
                      <button
                        onClick={() => {
                          setSelectedArticleId(featuredStory.id);
                        }}
                        className="px-5 py-3 bg-red-600/35 hover:bg-red-650/50 text-white rounded-xl text-xs font-bold border border-red-500/40 backdrop-blur-sm transition-all cursor-pointer flex items-center space-x-2"
                      >
                        <Video className="h-4 w-4 animate-pulse text-red-400" />
                        <span>{getUITranslation("watch_video", appLanguage)}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Secondary Filter Options Bar - sorting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h2 className="font-display font-extrabold text-slate-900 text-lg leading-tight flex items-center gap-2">
                  <span>{getUITranslation("feed_compilation", appLanguage)}</span>
                  {selectedCategory !== 'All' && (
                    <span className="text-xs font-medium text-slate-500 px-2.5 py-0.5 bg-slate-100 rounded-full">
                      {getUITranslation("category_" + selectedCategory.toLowerCase(), appLanguage)}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">{getUITranslation("feed_desc", appLanguage)}</p>
              </div>

              {/* Sort By controls */}
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-150 self-start sm:self-center">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mr-1">{getUITranslation("sort_options", appLanguage)}</span>
                
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none text-slate-700 cursor-pointer"
                  id="sort-select-input"
                >
                  <option value="newest">{getUITranslation("recent_publish", appLanguage)}</option>
                  <option value="popular">{getUITranslation("platform_views", appLanguage)}</option>
                  <option value="likes">{getUITranslation("recommended_likes", appLanguage)}</option>
                </select>
              </div>
            </div>

            {/* 3. Infinite Grid list */}
            {loading ? (
              <div className="text-center py-20" id="feed-scroller-loading">
                <div className="inline-block h-8 w-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
                <p className="text-xs text-slate-400 font-medium font-mono">{getUITranslation("syncing", appLanguage)}</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border max-w-md mx-auto" id="feed-scroller-empty">
                <Compass className="h-10 w-10 mx-auto stroke-1 text-slate-350 mb-3" />
                <h3 className="font-display font-bold text-sm text-slate-800">{getUITranslation("no_coverage_matched", appLanguage)}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
                  {getUITranslation("no_coverage_desc", appLanguage)}
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {getUITranslation("restore_home", appLanguage)}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="feed-articles-grid-list">
                {articles.map(art => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    currentUser={currentUser}
                    onSelect={() => setSelectedArticleId(art.id)}
                    isSaved={currentUser?.savedArticles.includes(art.id) || false}
                    onToggleSave={handleToggleSaveArticle}
                    language={appLanguage}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* ADMIN CMS & METRICS CONSOLE PANEL */}
        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminPanel
            currentUser={currentUser}
            articles={articles}
            onRefreshArticles={fetchArticles}
            onSelectArticle={(id) => {
              setSelectedArticleId(id);
            }}
            language={appLanguage}
          />
        )}

        {/* BOOKMARKS FEED VIEW */}
        {activeTab === 'bookmarks' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in" id="bookmarks-deck-module">
            <div>
              <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight flex items-center gap-2">
                {getUITranslation("saved_portfolio", appLanguage)}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{getUITranslation("saved_portfolio_desc", appLanguage)}</p>
            </div>

            {!currentUser ? (
              <div className="bg-white rounded-3xl p-12 text-center border max-w-sm mx-auto">
                <Compass className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-3 animate-bounce" />
                <h3 className="font-display font-bold text-sm text-slate-800">{getUITranslation("unloaded_title", appLanguage)}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">
                  {getUITranslation("unloaded_desc", appLanguage)}
                </p>
              </div>
            ) : bookmarkedArticles.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border max-w-md mx-auto">
                <Bookmark className="h-8 w-8 mx-auto stroke-1 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 leading-relaxed">{getUITranslation("no_bookmarks_desc", appLanguage)}</p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {getUITranslation("browse_home", appLanguage)}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="bookmarks-articles-grid">
                {bookmarkedArticles.map(art => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    currentUser={currentUser}
                    onSelect={() => setSelectedArticleId(art.id)}
                    isSaved={true}
                    onToggleSave={handleToggleSaveArticle}
                    language={appLanguage}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Popups & Drawers Orchestration overlay controllers */}
      {selectedArticleId && (
        <ArticleModal
          articleId={selectedArticleId}
          currentUser={currentUser}
          onClose={() => setSelectedArticleId(null)}
          onLike={handleLikeUpdate}
          onAddCommentCount={handleCommentCountUpdate}
          appLanguage={appLanguage}
        />
      )}



      {showNotifDrawer && (
        <NotificationDrawer
          onClose={() => setShowNotifDrawer(false)}
          notifications={notifications}
          onSelectArticle={(id) => setSelectedArticleId(id)}
        />
      )}

      {/* Footer component */}
      <footer className="bg-slate-950 text-slate-400 py-12 md:py-16 mt-auto border-t border-slate-900 relative overflow-hidden" id="portal-footer">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-32 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8">
            
            {/* Brand & Description Column */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-lg shadow-blue-900/20">
                  <Compass className="h-5 w-5" />
                </div>
                <span className="font-display font-extrabold text-xl text-white tracking-tight">{getUITranslation("app_title", appLanguage)}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                Engineering the future of journalism with uncompromising truth and speed. Bringing you real-time updates and breaking news across Maharashtra.
              </p>
            </div>

            {/* Links Column 1 */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4">Categories</h4>
              <ul className="space-y-2.5 text-xs">
                <li><button onClick={() => { setActiveTab('home'); setSelectedCategory('Politics'); window.scrollTo(0,0); }} className="hover:text-blue-400 transition-colors">Politics</button></li>
                <li><button onClick={() => { setActiveTab('home'); setSelectedCategory('Technology'); window.scrollTo(0,0); }} className="hover:text-blue-400 transition-colors">Technology</button></li>
                <li><button onClick={() => { setActiveTab('home'); setSelectedCategory('Business'); window.scrollTo(0,0); }} className="hover:text-blue-400 transition-colors">Business</button></li>
                <li><button onClick={() => { setActiveTab('home'); setSelectedCategory('Sports'); window.scrollTo(0,0); }} className="hover:text-blue-400 transition-colors">Sports</button></li>
                <li><button onClick={() => { setActiveTab('home'); setSelectedCategory('Science'); window.scrollTo(0,0); }} className="hover:text-blue-400 transition-colors">Science</button></li>
                <li><button onClick={() => { setActiveTab('home'); setSelectedCategory('Entertainment'); window.scrollTo(0,0); }} className="hover:text-blue-400 transition-colors">Entertainment</button></li>
              </ul>
            </div>

            {/* Links Column 2: Contact Info */}
            <div>
              <h4 className="text-white font-bold text-sm mb-4">Contact Us</h4>
              <ul className="space-y-4 text-xs">
                <li className="flex items-start space-x-3">
                  <Phone className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <a href="tel:7972055169" className="text-slate-400 hover:text-blue-400 transition-colors">
                    +91 7972055169
                  </a>
                </li>
                <li className="flex items-start space-x-3">
                  <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <a href="mailto:roshani93wahurwagh@gmail.com" className="text-slate-400 hover:text-blue-400 transition-colors break-all">
                    roshani93wahurwagh@gmail.com
                  </a>
                </li>
                <li className="pt-2">
                  <a href="#" className="text-slate-500 hover:text-white transition-colors inline-block">Privacy Policy</a>
                </li>
                <li>
                  <a href="#" className="text-slate-500 hover:text-white transition-colors">Terms of Service</a>
                </li>
              </ul>
            </div>



          </div>

          <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600 font-mono">
              {getUITranslation("footer_rights", appLanguage)}
            </p>
            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
              Developed by Vedant Prakash Dhawane
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
  
