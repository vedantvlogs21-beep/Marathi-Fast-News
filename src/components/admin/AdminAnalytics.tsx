import React from 'react';
import { 
  ArrowUpRight, FileText, Users, Sparkles, Smile, Meh, Frown 
} from 'lucide-react';
import { AnalyticsSummary, Article } from '../../types';
import { getUITranslation, Language } from '../../utils/translation';

interface AdminAnalyticsProps {
  analytics: AnalyticsSummary | null;
  articles: Article[];
  language: Language;
  aiInsight: string;
  generatingInsight: boolean;
  handleGenerateAIStrategy: () => void;
}

export default function AdminAnalytics({
  analytics,
  articles,
  language,
  aiInsight,
  generatingInsight,
  handleGenerateAIStrategy
}: AdminAnalyticsProps) {
  const lang = language;

  return (
    <div className="space-y-6 animate-fade-in" id="analytics-module">
      {/* Main Customizable Stats Card group */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-panel">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
            {getUITranslation("accumulative_views", lang)}
          </span>
          <p className="font-display font-extrabold text-3xl text-slate-900">{analytics?.totalViews ?? '...'}</p>
          <div className="flex items-center space-x-1 text-[10px] text-emerald-600 font-medium mt-2">
            <ArrowUpRight className="h-3 w-3" />
            <span>+12.4% {lang === 'mr' ? "साप्ताहिक वाढ" : "vs last week"}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
            {getUITranslation("newsarticles_stored", lang)}
          </span>
          <p className="font-display font-extrabold text-3xl text-slate-900">{analytics?.totalArticles ?? articles.length}</p>
          <div className="flex items-center space-x-1 text-[10px] text-sky-600 font-medium mt-2">
            <FileText className="h-3 w-3" />
            <span>{getUITranslation("active_curation_stream", lang)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
            {getUITranslation("profiles_registered", lang)}
          </span>
          <p className="font-display font-extrabold text-3xl text-slate-900">{analytics?.totalUsers ?? '...'}</p>
          <div className="flex items-center space-x-1 text-[10px] text-indigo-600 font-medium mt-2">
            <Users className="h-3 w-3" />
            <span>{getUITranslation("reader_retention_strong", lang)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block mb-1">
            {getUITranslation("comments_submitted", lang)}
          </span>
          <p className="font-display font-extrabold text-3xl text-slate-900">{analytics?.totalComments ?? '...'}</p>
          <div className="flex items-center space-x-1 text-[10px] text-pink-600 font-medium mt-2">
            <Sparkles className="h-3 w-3" />
            <span>{getUITranslation("high_visitor_engagement", lang)}</span>
          </div>
        </div>
      </div>

      {/* AI Strategy Board */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6" id="ai-strategist-board">
        <div className="space-y-2 md:max-w-lg">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-full font-mono">
              {lang === 'mr' ? "जेमिनी मुख्य रणनीती सल्लागार" : "Gemini Chief Strategist Insights"}
            </span>
          </div>
          <h3 className="font-display font-extrabold text-lg text-white">
            {lang === 'mr' ? "ऑपरेशनल कृती मार्गदर्शक तत्त्वे तयार करा" : "Generate Operational Action Guidelines"}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {lang === 'mr'
              ? "एकूण प्लॅटफॉर्म रहदारी, ग्राहकांच्या आवडीचे विषय, आणि टिप्पणी पद्धतींचे विश्लेषण करून त्वरित डेटा-चालित मार्गदर्शक माहिती मिळवा."
              : "Unlock instantaneous, data-driven Chief Strategist instructions analyzing total platforms traffic, customer categories, commenting behaviors, and recommend high-engagement topics."}
          </p>
        </div>

        <div className="shrink-0 max-w-sm w-full md:w-auto" id="ai-strategy-action">
          {aiInsight ? (
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-sm leading-relaxed text-slate-300 shadow-inner">
              <p className="font-serif italic text-white/90">"{aiInsight}"</p>
              <p className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-widest mt-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                {lang === 'mr' ? "धोरणात्मक मार्गदर्शन उपलब्ध करण्यात आले" : "Strategic Guidance Loaded"}
              </p>
            </div>
          ) : (
            <button
              onClick={handleGenerateAIStrategy}
              disabled={generatingInsight}
              className="w-full md:w-auto px-6 py-3.5 bg-white text-slate-950 text-sm font-bold font-display rounded-xl hover:bg-slate-100 transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {generatingInsight ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin mr-1.5" />
                  <span>{lang === 'mr' ? "पॅरामीटर्स तपासत आहे..." : "Evaluating Parameters..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-slate-700" />
                  <span>{lang === 'mr' ? "रणनीती तयार करा" : "Synthesize Strategy"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Traffic Progression (SVG Line Chart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
          <div>
            <h4 className="font-display font-extrabold text-base text-slate-900">
              {getUITranslation("traffic_progression", lang)}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'mr' ? "थेट दैनिक रहदारीचा ट्रेंड" : "Live daily traffic trajectory"}
            </p>
          </div>

          <div className="relative pt-4 h-64 w-full">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-[10px] text-slate-400 font-mono z-10 bg-white/80 pr-2">
              <span>10k</span>
              <span>7.5k</span>
              <span>5k</span>
              <span>2.5k</span>
              <span>0</span>
            </div>
            
            {/* SVG Graph */}
            <svg className="w-full h-full pl-8 pb-8" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="100" y2="0" stroke="#f1f5f9" strokeWidth="0.5" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="0.5" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="#f1f5f9" strokeWidth="0.5" />
              
              {/* Data Line */}
              {analytics && (() => {
                const maxViews = Math.max(...analytics.dailyViews.map(d => d.views), 100);
                return (
                  <polyline
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={analytics.dailyViews.map((day, idx, arr) => {
                      const x = (idx / (arr.length - 1)) * 100;
                      const y = 100 - (Math.min(day.views / maxViews, 1) * 100);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                );
              })()}
              
              {/* Data Points */}
              {analytics && (() => {
                const maxViews = Math.max(...analytics.dailyViews.map(d => d.views), 100);
                return analytics.dailyViews.map((day, idx, arr) => {
                  const x = (idx / (arr.length - 1)) * 100;
                  const y = 100 - (Math.min(day.views / maxViews, 1) * 100);
                  return (
                    <circle key={idx} cx={x} cy={y} r="1.5" fill="#0f172a" stroke="#fff" strokeWidth="0.5" className="hover:r-3 transition-all cursor-pointer" />
                  );
                });
              })()}
              
              {/* X-axis labels (HTML overlay for better text rendering) */}
            </svg>
            <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-slate-400 font-mono">
               {analytics?.dailyViews.map(day => (
                 <span key={day.date}>{lang === 'mr' ? day.date.replace("May", "मे") : day.date}</span>
               ))}
            </div>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col">
          <div>
            <h4 className="font-display font-extrabold text-base text-slate-900">
              {getUITranslation("sentiment_breakdown", lang)}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {getUITranslation("sentiment_desc", lang)}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Smile className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{getUITranslation("sentiment_positive", lang)}</p>
                  <p className="text-[10px] text-slate-500 font-mono">High Engagement</p>
                </div>
              </div>
              <span className="text-xl font-extrabold text-emerald-600 font-mono">{analytics?.sentimentBreakdown?.positive ?? 45}%</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-100/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Meh className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{getUITranslation("sentiment_neutral", lang)}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Balanced Views</p>
                </div>
              </div>
              <span className="text-xl font-extrabold text-amber-600 font-mono">{analytics?.sentimentBreakdown?.neutral ?? 35}%</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50/50 border border-red-100/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Frown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">{getUITranslation("sentiment_negative", lang)}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Critical</p>
                </div>
              </div>
              <span className="text-xl font-extrabold text-red-500 font-mono">{analytics?.sentimentBreakdown?.negative ?? 20}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Leaderboard */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
        <div>
          <h4 className="font-display font-extrabold text-base text-slate-900">
            {lang === 'mr' ? "टॉप कॅटेगरी परफॉर्मन्स" : "Top Category Performance"}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'mr' ? "एकूण व्ह्यूज आणि लेखांच्या संख्येवर आधारित" : "Based on total views and article count"}
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {analytics?.categoryStats.sort((a,b) => b.views - a.views).map((stat, idx) => {
            const mappedCategory = getUITranslation("category_" + stat.category.toLowerCase(), lang);
            return (
              <div key={stat.category} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 font-display font-bold text-4xl transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                  #{idx + 1}
                </div>
                <p className="text-sm font-bold text-slate-800 mb-2 relative z-10">{mappedCategory}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono relative z-10">
                  <span className="font-semibold text-slate-700">{stat.views} {lang === 'mr' ? "व्ह्यूज" : "views"}</span>
                  <span>{stat.count} {lang === 'mr' ? "लेख" : "articles"}</span>
                </div>
                <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden relative z-10">
                  <div className="bg-slate-900 h-full rounded-full" style={{ width: `${Math.max(5, (stat.views / Math.max(...analytics.categoryStats.map(s => s.views))) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
