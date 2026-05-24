import React, { useState, useEffect } from 'react';
import { Trash2, MessageSquare, Search } from 'lucide-react';
import { EnrichedComment } from '../../types';
import { Language } from '../../utils/translation';

interface AdminCommentsProps {
  language: Language;
  setGlobalSuccessMsg: (msg: string) => void;
  fetchAnalytics: () => void;
}

export default function AdminComments({
  language,
  setGlobalSuccessMsg,
  fetchAnalytics
}: AdminCommentsProps) {
  const lang = language;
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/comments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.warn("Error fetching comments for moderation", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    const confirmMsg = lang === 'mr'
      ? "ही टिप्पणी कायमची हटवायची आहे का?"
      : "Are you sure you want to permanently delete this comment?";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/comments/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setGlobalSuccessMsg(lang === 'mr' ? "टिप्पणी यशस्वीरित्या हटवली." : "Comment removed successfully.");
        fetchComments();
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredComments = comments.filter(c => 
    c.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.articleTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" id="comments-module">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-extrabold text-lg text-slate-900">
            {lang === 'mr' ? "टिप्पणी मॉडरेशन" : "Comment Moderation"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'mr' ? "स्पॅम आणि अयोग्य टिप्पण्या व्यवस्थापित करा." : "Review user discussions and remove inappropriate content across all articles."}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={lang === 'mr' ? "शोध..." : "Search by user, content, or article..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-medium">Loading comments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  <th className="p-4 pl-6 w-1/4">{lang === 'mr' ? "वापरकर्ता" : "User Info"}</th>
                  <th className="p-4 w-2/4">{lang === 'mr' ? "टिप्पणी आणि लेख" : "Comment & Article"}</th>
                  <th className="p-4 pr-6 text-right font-semibold">{lang === 'mr' ? "क्रिया" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
                {filteredComments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 text-sm font-medium">
                      {lang === 'mr' ? 'कोणत्याही टिप्पण्या सापडल्या नाहीत.' : 'No comments found.'}
                    </td>
                  </tr>
                ) : (
                  filteredComments.map(c => {
                    const postDate = new Date(c.timestamp);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        <td className="p-4 pl-6 align-top">
                          <div className="flex items-start space-x-3">
                            <div className="h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-1">
                              {c.username.slice(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 break-all">{c.username}</span>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {postDate.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 align-top">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-slate-800 text-sm font-serif leading-relaxed mb-3">"{c.content}"</p>
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                               <MessageSquare className="h-3 w-3 text-slate-400" />
                               <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">{c.articleTitle}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 pr-6 text-right align-top">
                          <div className="flex items-center justify-end space-x-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="px-3 py-1.5 text-[10px] font-bold font-mono uppercase bg-red-50 text-red-700 hover:bg-red-100 rounded-lg cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                              title={lang === 'mr' ? "हटवा" : "Delete Comment"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {lang === 'mr' ? "हटवा" : "Remove"}
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
