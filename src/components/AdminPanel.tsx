import React, { useState, useEffect } from 'react';
import { 
  LineChart, FileText, Users, MessageSquare, BellRing, 
  Check, Menu, X, ArrowLeft
} from 'lucide-react';
import { Article, User, AnalyticsSummary } from '../types';
import { getUITranslation, Language } from '../utils/translation';

import AdminAnalytics from './admin/AdminAnalytics';
import AdminCMS from './admin/AdminCMS';
import AdminUsers from './admin/AdminUsers';
import AdminComments from './admin/AdminComments';
import AdminDispatch from './admin/AdminDispatch';

interface AdminPanelProps {
  currentUser: User | null;
  articles: Article[];
  onRefreshArticles: () => void;
  onSelectArticle: (articleId: string) => void;
  language?: Language;
}

type TabKey = 'analytics' | 'cms' | 'users' | 'comments' | 'dispatch';

export default function AdminPanel({
  currentUser,
  articles,
  onRefreshArticles,
  onSelectArticle,
  language = 'en'
}: AdminPanelProps) {
  
  const lang = language;
  const [activeTab, setActiveTab] = useState<TabKey>('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Analytics states (lifted here so multiple tabs can trigger fetch)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [aiInsight, setAiInsight] = useState('');
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Users states
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchUsers();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch('/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.warn("Analytics retrieval issues:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleGenerateAIStrategy = async () => {
    if (!analytics) return;
    try {
      setGeneratingInsight(true);
      
      let topCategoryName = "Technology";
      let topViews = 0;
      analytics.categoryStats.forEach(stat => {
        if (stat.views > topViews) {
          topViews = stat.views;
          topCategoryName = stat.category;
        }
      });

      const res = await fetch('/api/ai/admin-insights', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          totalViews: analytics.totalViews,
          totalArticles: analytics.totalArticles,
          totalUsers: analytics.totalUsers,
          totalComments: analytics.totalComments,
          focusCategory: topCategoryName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.insight);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingInsight(false);
    }
  };

  // Auto-hide success messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const tabs: { key: TabKey, icon: any, labelEn: string, labelMr: string, badge?: number }[] = [
    { key: 'analytics', icon: LineChart, labelEn: 'Website Stats', labelMr: 'वेबसाइट आकडेवारी' },
    { key: 'cms', icon: FileText, labelEn: 'Manage Articles', labelMr: 'लेख व्यवस्थापन', badge: articles.length },
    { key: 'users', icon: Users, labelEn: 'Manage Users', labelMr: 'वापरकर्ता व्यवस्थापन', badge: usersList.length },
    { key: 'comments', icon: MessageSquare, labelEn: 'Manage Comments', labelMr: 'टिप्पण्या व्यवस्थापन', badge: analytics?.totalComments },
    { key: 'dispatch', icon: BellRing, labelEn: 'Breaking News', labelMr: 'महत्त्वाची बातमी' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-slate-50 relative" id="admin-panel-console">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Dark Sidebar */}
      <div className={`
        fixed lg:fixed top-0 lg:top-16 left-0 h-full lg:h-[calc(100vh-64px)] 
        w-64 bg-slate-950 text-slate-300 z-50 lg:z-30 flex flex-col border-r border-white/5
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div>
            <h2 className="font-display font-extrabold text-white text-xl tracking-tight">
              {lang === 'mr' ? 'प्रशासक नियंत्रण' : 'Admin Control'}
            </h2>
            <p className="text-[10px] font-mono text-blue-400 mt-1 uppercase tracking-widest">
              Command Center
            </p>
          </div>
          <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  closeSidebar();
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600/15 text-blue-400 shadow-sm border border-blue-500/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{lang === 'mr' ? tab.labelMr : tab.labelEn}</span>
                </div>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-slate-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-white/5">
           <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
             <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase shadow-inner">
               {currentUser?.username?.slice(0, 2) || 'AD'}
             </div>
             <div>
               <p className="text-xs font-bold text-white line-clamp-1">{currentUser?.username}</p>
               <p className="text-[10px] text-slate-400 font-mono">System Admin</p>
             </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64">
        
        {/* Mobile Header Toggle */}
        <div className="lg:hidden flex items-center gap-3 p-4 bg-white border-b border-slate-100 shadow-sm">
          <button 
            onClick={toggleSidebar}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-display font-extrabold text-slate-900 text-lg">
            {tabs.find(t => t.key === activeTab)?.labelEn}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Global Toast Success Alerts */}
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 flex items-center space-x-3 mb-8 animate-fade-in shadow-sm">
                <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                   <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-semibold">{successMsg}</span>
                <button onClick={() => setSuccessMsg('')} className="ml-auto p-1.5 hover:bg-emerald-100 rounded-lg transition-colors">
                  <X className="h-4 w-4 text-emerald-600" />
                </button>
              </div>
            )}

            {/* Content Switcher */}
            {activeTab === 'analytics' && (
              <AdminAnalytics 
                analytics={analytics} 
                articles={articles} 
                language={lang} 
                aiInsight={aiInsight}
                generatingInsight={generatingInsight}
                handleGenerateAIStrategy={handleGenerateAIStrategy}
              />
            )}
            
            {activeTab === 'cms' && (
              <AdminCMS 
                articles={articles}
                onRefreshArticles={onRefreshArticles}
                onSelectArticle={onSelectArticle}
                language={lang}
                setGlobalSuccessMsg={setSuccessMsg}
                fetchAnalytics={fetchAnalytics}
              />
            )}

            {activeTab === 'users' && (
              <AdminUsers 
                currentUser={currentUser}
                usersList={usersList}
                loadingUsers={loadingUsers}
                fetchUsers={fetchUsers}
                fetchAnalytics={fetchAnalytics}
                language={lang}
                setGlobalSuccessMsg={setSuccessMsg}
              />
            )}

            {activeTab === 'comments' && (
              <AdminComments 
                language={lang}
                setGlobalSuccessMsg={setSuccessMsg}
                fetchAnalytics={fetchAnalytics}
              />
            )}

            {activeTab === 'dispatch' && (
              <AdminDispatch 
                articles={articles}
                language={lang}
                setGlobalSuccessMsg={setSuccessMsg}
              />
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
