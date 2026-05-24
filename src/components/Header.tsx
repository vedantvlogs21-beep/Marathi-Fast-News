import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Compass, Search, User, LogOut, LogIn, Bookmark, Bell, Settings, Sparkles, X, Check, Languages, Lock, ArrowRight } from 'lucide-react';
import { User as UserType, SystemNotification } from '../types';
import { getUITranslation, Language } from '../utils/translation';

interface HeaderProps {
  currentUser: UserType | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: 'home' | 'admin' | 'bookmarks';
  setActiveTab: (tab: 'home' | 'admin' | 'bookmarks') => void;
  notifications: SystemNotification[];
  onOpenNotifications: () => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  appLanguage: Language;
  setAppLanguage: (lang: Language) => void;
}

const CATEGORIES = ["All", "Politics", "Technology", "Business", "Sports", "Science", "Entertainment"];

export default function Header({
  currentUser,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  notifications,
  onOpenNotifications,
  selectedCategory,
  setSelectedCategory,
  appLanguage,
  setAppLanguage
}: HeaderProps) {
  const [showNotificationCount, setShowNotificationCount] = useState(true);

  // Admin Access Gate State
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [logoError, setLogoError] = useState(false);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'marathifast2407') {
      setPasswordError(false);
      setShowPasswordGate(false);
      setPasswordInput('');
      setActiveTab('admin');
    } else {
      setPasswordError(true);
    }
  };


  const handleSecretAdminClick = () => {
    setActiveTab('home');
    setSelectedCategory('All');
    
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount >= 2) {
        if (activeTab !== 'admin') setShowPasswordGate(true);
        return 0;
      }
      return newCount;
    });

    // Reset the counter if they don't double click quickly
    setTimeout(() => setLogoClicks(0), 1000);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm" id="portal-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and App Title */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={handleSecretAdminClick}>
            <div className="flex-shrink-0" id="logo-icon-container">
              {!logoError ? (
                <img 
                  src="/logo.png" 
                  alt="Marathi Fast News" 
                  className="h-11 w-11 rounded-full object-cover shadow-sm border border-slate-200" 
                  onError={() => setLogoError(true)} 
                />
              ) : (
                <div className="bg-slate-900 text-white p-2 rounded-lg shadow-sm">
                  <Compass className="h-6 w-6 animate-pulse" />
                </div>
              )}
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight text-slate-900">{getUITranslation("app_title", appLanguage)}</span>
              <span className="font-sans font-medium text-xs block text-slate-500 tracking-widest -mt-1 uppercase">{getUITranslation("app_sub", appLanguage)}</span>
            </div>
          </div>

          {/* Search Box - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative" id="search-desktop-wrapper">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={getUITranslation("search_placeholder", appLanguage)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-800"
              id="search-input-desktop"
            />
          </div>

          {/* Right Action Icons Group */}
          <div className="flex items-center space-x-3 md:space-x-4" id="header-right-actions">
            
            {/* Global Language Toggle Pill */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-full p-0.5" id="language-global-toggle-pill">
              <button
                type="button"
                onClick={() => setAppLanguage('en')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                  appLanguage === 'en'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setAppLanguage('mr')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                  appLanguage === 'mr'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="मराठीत बदला"
              >
                मराठी
              </button>
            </div>

            {/* bookmarks Tab Toggle */}
            <button
              onClick={() => setActiveTab(activeTab === 'bookmarks' ? 'home' : 'bookmarks')}
              className={`p-2 rounded-full cursor-pointer transition-colors relative ${
                activeTab === 'bookmarks' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              title="Bookmarks"
              id="bookmarks-toggle-btn"
            >
              <Bookmark className="h-5 w-5" />
              {currentUser && currentUser.savedArticles.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Notifications Alert Center */}
            <button
              onClick={() => {
                onOpenNotifications();
                setShowNotificationCount(false);
              }}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer transition-colors relative"
              title="Notifications"
              id="notifications-toggle-btn"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && showNotificationCount && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>

            {/* Removed Admin Access Controls (Settings gear) */}

          </div>
        </div>

        {/* Global Sub-categories filtration ribbon - only shown if not in bookmarks/admin screens */}
        {activeTab === 'home' && (
          <div className="py-2.5 overflow-x-auto scrollbar-none flex items-center justify-between border-t border-slate-50" id="categories-ribbon">
            <div className="flex space-x-1.5 md:space-x-3 mr-4">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.2 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  id={`cat-filter-${cat.toLowerCase()}`}
                >
                  {getUITranslation("category_" + cat.toLowerCase(), appLanguage)}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>


      {/* Admin Password Gate Modal */}
      {showPasswordGate && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in" id="admin-password-modal">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2 text-slate-900">
                  <Lock className="h-5 w-5" />
                  <h3 className="font-display font-bold text-lg">Admin Access</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowPasswordGate(false);
                    setPasswordError(false);
                    setPasswordInput('');
                  }} 
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <form onSubmit={handleAdminAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Master Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 border focus:outline-none transition-all ${
                      passwordError ? 'border-red-500 focus:border-red-500 text-red-900' : 'border-slate-200 focus:border-slate-900 focus:bg-white text-slate-900'
                    }`}
                    placeholder="Enter password..."
                    autoFocus
                  />
                  {passwordError && <p className="text-xs text-red-500 mt-2 font-medium">Incorrect password. Please try again.</p>}
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span>Unlock Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

    </header>
  );
}
