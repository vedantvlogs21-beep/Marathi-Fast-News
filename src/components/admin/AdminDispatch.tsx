import React, { useState } from 'react';
import { BellRing, ShieldAlert, Send } from 'lucide-react';
import { Article, SystemNotification } from '../../types';
import { getUITranslation, Language } from '../../utils/translation';

interface AdminDispatchProps {
  articles: Article[];
  language: Language;
  setGlobalSuccessMsg: (msg: string) => void;
}

export default function AdminDispatch({
  articles,
  language,
  setGlobalSuccessMsg
}: AdminDispatchProps) {
  const lang = language;
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [articleId, setArticleId] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !message.trim()) {
      setErrorMsg(lang === 'mr' ? "शीर्षक आणि संदेश दोन्ही आवश्यक आहेत." : "Both title and message are required to dispatch.");
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/notifications/trigger-breaking', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          articleId: articleId || undefined
        })
      });

      if (!res.ok) {
        throw new Error("Failed to dispatch notification");
      }

      setGlobalSuccessMsg(lang === 'mr' ? "अलर्ट यशस्वीरित्या पाठवला." : "Breaking news alert dispatched across all active clients.");
      setTitle('');
      setMessage('');
      setArticleId('');
    } catch (err: any) {
      setErrorMsg(err.message || "Dispatch failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="dispatch-module">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-extrabold text-lg text-slate-900">
            {lang === 'mr' ? "ब्रेकिंग न्यूज डिस्पॅच" : "Breaking News Dispatch"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'mr' ? "सर्व वापरकर्त्यांना तात्काळ सूचना पाठवा." : "Send immediate, high-priority push notifications to all connected readers."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dispatch Form */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleDispatch} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                {lang === 'mr' ? "अलर्ट शीर्षक" : "Alert Headline"}
              </label>
              <input
                type="text"
                required
                placeholder="E.g. MAJOR UPDATE: Tsunami Warning..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                {lang === 'mr' ? "अलर्ट संदेश" : "Alert Message"}
              </label>
              <textarea
                required
                rows={3}
                placeholder="Provide a concise, urgent message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                {lang === 'mr' ? "संबंधित लेख (पर्यायी)" : "Linked Article (Optional)"}
              </label>
              <select
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800"
              >
                <option value="">{lang === 'mr' ? "-- कोणताही लेख नाही --" : "-- No Linked Article --"}</option>
                {articles.map(art => (
                  <option key={art.id} value={art.id}>{art.title.substring(0, 50)}...</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full mt-4 px-6 py-3.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                  <span>{lang === 'mr' ? "पाठवत आहे..." : "Dispatching..."}</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>{lang === 'mr' ? "अलर्ट पाठवा" : "Dispatch Global Alert"}</span>
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Helper Panel */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col justify-center">
          <div className="h-16 w-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
            <BellRing className="h-8 w-8 text-red-500 animate-pulse" />
          </div>
          <h4 className="font-display font-extrabold text-2xl text-white mb-3">
            Priority Dispatch Guidelines
          </h4>
          <p className="text-slate-400 leading-relaxed text-sm">
            Push notifications are highly disruptive. Only use this feature for <strong>critical, breaking developments</strong> that require immediate attention.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-300 font-medium">
            <li className="flex items-center gap-2">
               <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
               Keep headlines under 50 characters.
            </li>
            <li className="flex items-center gap-2">
               <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
               Link a detailed article when possible.
            </li>
            <li className="flex items-center gap-2">
               <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
               Double check all facts before dispatch.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
